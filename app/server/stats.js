const fs = require("fs/promises");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const sh = promisify(exec);

const PROC = process.env.PROC_ROOT || "/host/proc";
const SYS  = process.env.SYS_ROOT  || "/host/sys";
const HOST = process.env.HOST_ROOT || "/hostroot";
const DPKG = process.env.DPKG_ROOT || "/host/var/lib/dpkg";

const readFileSafe = async (p) => { try { return await fs.readFile(p, "utf8"); } catch { return null; } };
const readdirSafe = async (p) => { try { return await fs.readdir(p); } catch { return []; } };
const statfsSafe  = async (p) => { try { return await fs.statfs(p); } catch { return null; } };
const clamp       = (n, a, b) => Math.max(a, Math.min(b, n));
const pct         = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);


const SMART_PARAMS = {
    start: 0,
    limit: -1,
    sort: [{ property: "devicefile", direction: "ASC" }],
};
const EXE_OPTS = {
    timeout: 15000,
    env: { LC_ALL: 'C', LANG: 'C' },
    maxBuffer: 10 * 1024 * 1024,
};
function loadConfig() {
    const raw = fs.readFileSync("/data/config.json", "utf-8");
    return JSON.parse(raw);
}
async function readMem() {
    const txt = await readFileSafe(`${PROC}/meminfo`);
    if (!txt) return { total: 0, used: 0, percent: 0 };
    const map = {};
    for (const line of txt.split("\n")) {
        const [k, v] = line.split(":");
        if (!k || !v) continue;
        map[k.trim()] = parseInt(v, 10) * 1024;
    }
    const total = map.MemTotal || 0;
    const free  = (map.MemFree || 0) + (map.Buffers || 0) + (map.Cached || 0);
    const used  = Math.max(0, total - free);
    return { total, used, percent: total ? pct(used, total) : 0 };
}

async function readLoadUptime() {
    const loadTxt = await readFileSafe(`${PROC}/loadavg`);
    const upTxt   = await readFileSafe(`${PROC}/uptime`);
    let load = [0,0,0], uptime = { days:0, hours:0, mins:0 };
    if (loadTxt) {
        const [a,b,c] = loadTxt.trim().split(/\s+/).slice(0,3).map(Number);
        load = [a||0,b||0,c||0];
    }
    if (upTxt) {
        const sec = Math.floor(parseFloat(upTxt.trim().split(/\s+/)[0]) || 0);
        uptime = { days: Math.floor(sec/86400), hours: Math.floor((sec%86400)/3600), mins: Math.floor((sec%3600)/60) };
    }
    return { load, uptime };
}


async function readSmartListViaOmvRpc(HOST) {
    const config = loadConfig();
    const cmd = `chroot ${HOST} /usr/sbin/omv-rpc Smart getList '${JSON.stringify(SMART_PARAMS)}'`;
    const { stdout } = await sh(cmd, EXE_OPTS);
    return JSON.parse(stdout);
}

async function readOmvSmartList() {
    try {
        const j = await readSmartListViaOmvRpc(HOST);
        return Array.isArray(j?.data) ? j.data : [];
    } catch {
        return [];
    }
}

async function resolveByIdToDev(byIdPath) {
    try {
        const full = path.posix.join(HOST, byIdPath);
        const real = await fs.realpath(full);
        return real.replace(`${HOST}`, "");
    } catch { return null; }
}

async function readDriveUsageMap() {
    let lb;
    try {
        const { stdout } = await sh(`chroot ${HOST} /bin/bash -lc "lsblk -J -b -o NAME,TYPE,SIZE,MOUNTPOINT"`);
        lb = JSON.parse(stdout);
    } catch { return new Map(); }

    const usage = new Map();

    async function partUsage(mount) {
        const hostMount = path.posix.join(HOST, mount);
        const st = await statfsSafe(hostMount);
        if (!st) return { total:0, used:0 };
        const bs = st.bsize || st.frsize || 4096;
        const total = Number(st.blocks || 0) * bs;
        const free  = Number(st.bfree || 0) * bs;
        const used  = Math.max(0, total - free);
        return { total, used };
    }

    async function walk(dev, parentDisk = null) {
        const isDisk = dev.type === "disk";
        const name   = dev.name;
        if (isDisk) {
            usage.set(`/dev/${name}`, { sizeBytes: Number(dev.size||0), usedBytes: 0 });
            parentDisk = `/dev/${name}`;
        }
        if (Array.isArray(dev.children)) {
            for (const ch of dev.children) {
                if (ch.type === "part" && ch.mountpoint && ch.mountpoint !== "" && ch.mountpoint !== "[SWAP]") {
                    const u = await partUsage(ch.mountpoint);
                    const cur = usage.get(parentDisk) || { sizeBytes: 0, usedBytes: 0 };
                    usage.set(parentDisk, { sizeBytes: cur.sizeBytes, usedBytes: cur.usedBytes + u.used });
                }
                await walk(ch, parentDisk);
            }
        }
    }

    if (Array.isArray(lb?.blockdevices)) {
        for (const d of lb.blockdevices) await walk(d);
    }
    return usage;
}

async function readOMV() {
    const status = await readFileSafe(`${DPKG}/status`);
    if (!status) return { omv: null, plugins: [] };
    const blocks = status.split("\n\n");
    let omv = null; const plugins = [];
    for (const b of blocks) {
        const pkg = b.match(/^Package:\s*(.+)$/m)?.[1]?.trim();
        if (!pkg) continue;
        const ver = b.match(/^Version:\s*(.+)$/m)?.[1]?.trim();
        if (!ver) continue;
        if (pkg === "openmediavault") omv = ver;
        else if (pkg.startsWith("openmediavault-")) plugins.push({ name: pkg.replace(/^openmediavault-/, ""), version: ver });
    }
    plugins.sort((a,b)=>a.name.localeCompare(b.name));
    return { omv, plugins };
}

async function readDockerUpdates() {
    const out = { updates: [], total: 0 };
    try {
        const { stdout } = await sh("docker ps --format '{{.Names}}|{{.Image}}'");
        const lines = stdout.trim() ? stdout.trim().split("\n") : [];
        for (const line of lines) {
            const [name, image] = line.split("|");
            if (!name || !image) continue;
            try {
                const { stdout: before } = await sh(`docker image inspect --format='{{.Id}}' ${image}`);
                await sh(`docker pull -q ${image}`);
                const { stdout: after } = await sh(`docker image inspect --format='{{.Id}}' ${image}`);
                if (before.trim() !== after.trim()) {
                    out.updates.push({ container: name, image, current: before.trim(), latest: after.trim() });
                }
            } catch {}
        }
        out.total = out.updates.length;
    } catch {}
    return out;
}


async function readDockerContainers() {
    try {
        const { stdout } = await sh(`docker ps -a --format '{{json .}}'`);
        const lines = stdout.trim() ? stdout.trim().split("\n") : [];
        const items = [];
        for (const line of lines) {
            try {
                const obj = JSON.parse(line);
                items.push({ name: obj.Names || obj.Name || "", status: obj.Status || "" });
            } catch {}
        }
        return items;
    } catch (e) {
        return [];
    }
}
async function readTempsCpuChassis() {
    let cpu = null;
    try {
        const hwmons = await readdirSafe(`${SYS}/class/hwmon`);
        let best = null;
        for (const h of hwmons) {
            const dir = `${SYS}/class/hwmon/${h}`;
            const name = (await readFileSafe(`${dir}/name`))?.trim().toLowerCase() || "";
            const files = await readdirSafe(dir);
            for (const f of files) {
                if (!/^temp[0-9]+_input$/.test(f)) continue;
                const vTxt = await readFileSafe(`${dir}/${f}`);
                const millic = parseInt(vTxt, 10);
                if (!isNaN(millic)) {
                    const c = Math.round(millic / 1000);
                    if (name.match(/(k10temp|coretemp|cpu|zenpower)/)) best = c;
                }
            }
        }
        if (best != null) cpu = `${best}°C`;
    } catch {}
    const chassis = [];
    try {
        const hwmons = await readdirSafe(`${SYS}/class/hwmon`);
        for (const h of hwmons) {
            const dir = `${SYS}/class/hwmon/${h}`;
            const name = (await readFileSafe(`${dir}/name`))?.trim().toLowerCase() || "";
            if (!name.match(/(acpitz|pch|motherboard|system|chassis)/)) continue;
            const files = await readdirSafe(dir);
            for (const f of files) {
                if (!/^temp[0-9]+_input$/.test(f)) continue;
                const vTxt = await readFileSafe(`${dir}/${f}`);
                const millic = parseInt(vTxt, 10);
                if (!isNaN(millic)) chassis.push({ label: name, tempC: Math.round(millic / 1000) });
            }
        }
    } catch {}
    return { cpu, chassis };
}

async function readPhysicalDrives() {
    const list = await readOmvSmartList();
    if (!list.length) return [];

    const usageMap = await readDriveUsageMap();

    const drives = [];
    for (const d of list) {
        const byIdOrDev = d?.devicefile || "";
        let dev = byIdOrDev;
        if (byIdOrDev.startsWith("/dev/disk/by-id/")) {
            dev = await resolveByIdToDev(byIdOrDev) || byIdOrDev;
        }

        if (!dev || !/^\/dev\/(sd[a-z]+|nvme\d+n\d+)$/.test(dev)) continue;

        const model = (d?.model && String(d.model).trim()) ? String(d.model).trim() : null;
        let tempC = (typeof d?.temperature === "number") ? d.temperature : null;

        const rawStatus = d?.overallstatus || d?.overall_status || d?.overall || d?.smart_status || d?.health || "";
        const status = String(rawStatus || "").toUpperCase() || "UNKNOWN";
        const u = usageMap.get(dev) || { sizeBytes: 0, usedBytes: 0 };
        const sizeBytes = u.sizeBytes;
        const usedBytes = u.usedBytes;
        const usedPercent = sizeBytes > 0 ? clamp(Math.round((usedBytes / sizeBytes) * 100), 0, 100) : null;

        drives.push({
            device: dev,
            byId: byIdOrDev,
            model,
            tempC,
            status,
            sizeBytes,
            usedBytes,
            usedPercent
        });
    }

    const seen = new Map();
    for (const d of drives) if (!seen.has(d.device)) seen.set(d.device, d);
    return Array.from(seen.values()).sort((a,b)=>a.device.localeCompare(b.device));
}

async function getStats() {
    const [{ load, uptime }, ram, tempsCpuChassis, container, containers, drives] = await Promise.all([
        readLoadUptime(),
        readMem(),
        readTempsCpuChassis(),
        readOMV(),
        readDockerContainers(),
        readPhysicalDrives(),
    ]);

    return {
        ts: Date.now(),
        ram,
        load,
        uptime,
        temps: tempsCpuChassis,
        container,
        containers,
        disks: drives
    };
}

module.exports = { getStats };
