// server/stats.js — OMV-gestützte physische Laufwerke + RAM/Load/Temps/Docker
// Voraussetzungen: Container mit privileged + Mounts:
//  - /:/hostroot:ro,rslave
//  - /proc:/host/proc:ro
//  - /sys:/host/sys:ro
//  - /var/lib/dpkg:/host/var/lib/dpkg:ro
//
// Host muss das Script /usr/local/bin/omv-smart-json.sh bereitstellen (liefert OMV "Smart getList")

const fs = require("fs/promises");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const shWithTimeout = (cmd, timeout = 5000) => promisify(exec)(cmd, { timeout });
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

// ---------------- RAM / Load / Uptime ----------------
async function readMem() {
    const txt = await readFileSafe(`${PROC}/meminfo`);
    if (!txt) return { total: 0, used: 0, percent: 0 };
    const map = {};
    for (const line of txt.split("\n")) {
        const [k, v] = line.split(":");
        if (!k || !v) continue;
        map[k.trim()] = parseInt(v, 10) * 1024; // kB -> B
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

// ---------------- OMV SMART JSON (Host) ----------------
async function readOmvSmartList() {
    // nutzt den Host-Stack via chroot; NOCH autonom aus dem Container aufrufbar
    try {
        const { stdout } = await sh(`chroot ${HOST} /bin/bash -lc '/usr/local/bin/omv-smart-json.sh'`);
        const j = JSON.parse(stdout);
        return Array.isArray(j?.data) ? j.data : [];
    } catch {
        return [];
    }
}

// by-id → /dev/sdX
async function resolveByIdToDev(byIdPath) {
    try {
        const full = path.posix.join(HOST, byIdPath);
        const real = await fs.realpath(full); // z.B. /hostroot/dev/sdb
        const dev  = real.replace(`${HOST}`, ""); // /dev/sdb
        return dev;
    } catch { return null; }
}

// ---------------- Drive Usage (Gesamt pro physischem Laufwerk) ----------------
async function readDriveUsageMap() {
    // lsblk auf dem Host (alle Devices, inkl. Mountpoints)
    let lb;
    try {
        const { stdout } = await sh(`chroot ${HOST} /bin/bash -lc "lsblk -J -b -o NAME,TYPE,SIZE,MOUNTPOINT"`);
        lb = JSON.parse(stdout);
    } catch { return new Map(); }

    const usage = new Map(); // "/dev/sdX" -> { sizeBytes, usedBytes }

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
        const name   = dev.name; // sda / nvme0n1 etc.
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

// ---------------- Versionen / Docker ----------------
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

// ---------------- Temperaturen (nur CPU + Chassis) ----------------
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

// ---------------- Drives (physisch) aus OMV + Usage ----------------



async function readPhysicalDrives() {
    // OMV SMART-Liste
    const list = await readOmvSmartList();
    if (!list.length) return [];

    const usageMap = await readDriveUsageMap();

    const drives = [];
    for (const d of list) {
        // OMV-Felder: devicefile (by-id ODER /dev/*), model, temperature, overallstatus (oder ähnliche Schreibweise)
        const byIdOrDev = d?.devicefile || "";
        let dev = byIdOrDev;
        if (byIdOrDev.startsWith("/dev/disk/by-id/")) {
            dev = await resolveByIdToDev(byIdOrDev) || byIdOrDev; // versuche /dev/sdX
        }

        // nur physische Blockgeräte
        if (!dev || !/^\/dev\/(sd[a-z]+|nvme\d+n\d+)$/.test(dev)) continue;

        const model = (d?.model && String(d.model).trim()) ? String(d.model).trim() : null;
        // const tempC = (typeof d?.temperature === "number") ? d.temperature : null;
        let tempC = (typeof d?.temperature === "number") ? d.temperature : null;
        // SandForce-basiert: Corsair Force LS meldet oft keine verlässliche Temperatur → auf NULL setzen
        // if (model && model.toLowerCase() === "corsair force ls ssd") {
        //     tempC = null;
        // }


        // overallstatus: robuste Extraktion (verschiedene OMV-Versionen nutzen abweichende Keys)
        const rawStatus = d?.overallstatus || d?.overall_status || d?.overall || d?.smart_status || d?.health || "";
        const status = String(rawStatus || "").toUpperCase() || "UNKNOWN";

        const u = usageMap.get(dev) || { sizeBytes: 0, usedBytes: 0 };
        const sizeBytes = u.sizeBytes;
        const usedBytes = u.usedBytes;
        const usedPercent = sizeBytes > 0 ? clamp(Math.round((usedBytes / sizeBytes) * 100), 0, 100) : null;


        drives.push({
            device: dev,              // /dev/sdX
            byId: byIdOrDev,          // /dev/disk/by-id/...
            model,                    // z. B. "Corsair Force LS SSD"
            tempC,                    // z. B. 77
            status,                   // GOOD / WARNING / FAILING / UNKNOWN ...
            sizeBytes,
            usedBytes,
            usedPercent
        });
    }

    // deduplizieren (falls OMV-Duplikate liefert)
    const seen = new Map();
    for (const d of drives) if (!seen.has(d.device)) seen.set(d.device, d);
    return Array.from(seen.values()).sort((a,b)=>a.device.localeCompare(b.device));
}

// ---------------- Aggregation ----------------
// async function getStats() {
//     //const [{ load, uptime }, ram, tempsCpuChassis, versions, dockerUpdates, drives, containers] = await Promise.all([
//     const [{ load, uptime }, ram, tempsCpuChassis, versions, docker, drives, containers] = await Promise.all([
//         readLoadUptime(),
//         readMem(),
//         readTempsCpuChassis(),
//         readOMV(),
//         readDockerUpdates(),
//         readPhysicalDrives(),
//         readDockerContainers()
//     ]);
//
//     return {
//         ts: Date.now(),
//         ram,
//         load,
//         uptime,
//         temps: tempsCpuChassis, // nur CPU + Chassis
//         versions,
//         docker,
//         disks: drives,
//         containers
//     };
// }

async function getStats() {
    // Basisinfos (schnell!)
    const [loaduptime, ram, temps, versions, drives] = await Promise.all([
        readLoadUptime(),
        readMem(),
        readTempsCpuChassis(),
        readOMV(),
        readPhysicalDrives()
    ]);

    return {
        load: loaduptime.load,
        uptime: loaduptime.uptime,
        ram,
        temps,
        versions,
        drives
    };
}
async function getDockerStats() {
    const [containers, dockerUpdates] = await Promise.all([
        readDockerContainers(),
        readDockerUpdates()
    ]);

    return {
        containers,
        dockerUpdates,
        totalUpdates: dockerUpdates.total
    };
}



async function readDockerContainers() {
    try {
        // Ruft Container-ID (kurz), Name und Status ab
        const { stdout } = await shWithTimeout('docker ps --format "{{.ID}}|{{.Names}}|{{.Status}}"', 5000);

        const lines = stdout.trim().split('\n').filter(l => l.length > 0);

        const containers = lines.map(line => {
            const parts = line.split('|');
            const id = parts[0].substring(0, 4);
            const name = parts[1];
            const status = parts[2].trim();

            return { id, name, status };
        });

        return containers;

    } catch (e) {
        // Fehler, falls Docker nicht läuft oder der Befehl fehlschlägt
        console.warn("Could not read Docker container status:", e.message);
        return [];
    }
}

async function readDockerUpdates() {
    const out = { updates: [], total: 0 };
    try {
        // Wir verwenden shWithTimeout mit 15 Sekunden
        const { stdout } = await shWithTimeout("docker ps --format '{{.Names}}|{{.Image}}'", 15000);
        const lines = stdout.trim() ? stdout.trim().split("\n") : [];

        // Die Pull-Vorgänge einzeln ausführen, um eine lange Blockade zu verhindern
        for (const line of lines) {
            const [name, image] = line.split("|");
            if (!name || !image) continue;
            try {
                // IDs abrufen (vor und nach Pull) – hier verwenden wir wieder shWithTimeout
                const { stdout: before } = await shWithTimeout(`docker image inspect --format='{{.Id}}' ${image}`, 5000);

                // Pull mit einem etwas längeren Timeout (z.B. 15s)
                await shWithTimeout(`docker pull -q ${image}`, 15000);

                const { stdout: after } = await shWithTimeout(`docker image inspect --format='{{.Id}}' ${image}`, 5000);

                if (before.trim() !== after.trim()) {
                    out.updates.push({ container: name, image, current: before.trim(), latest: after.trim() });
                }
            } catch (e) {
                // Fehler beim Pull oder Inspect ignorieren
                // console.warn(`Docker update check failed for ${name}: ${e.message}`);
            }
        }
        out.total = out.updates.length;
    } catch (e) {
        // Fehler, falls docker ps fehlschlägt (z.B. Timeout)
        console.warn(`Docker updates check failed: ${e.message}`);
    }
    return out;
}




module.exports = {
    getStats,
    getDockerStats
};
