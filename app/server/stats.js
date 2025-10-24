// server/stats.js — liest Host-Daten über gemountete Roots
const fs = require("fs/promises");
const { exec } = require("child_process");
const { promisify } = require("util");
const sh = promisify(exec);

const PROC = process.env.PROC_ROOT || "/host/proc";
const SYS  = process.env.SYS_ROOT  || "/host/sys";
const HOST = process.env.HOST_ROOT || "/hostroot";
const DPKG = process.env.DPKG_ROOT || "/host/var/lib/dpkg";

// ---------- Helpers ----------
async function readFile(p) {
    try { return await fs.readFile(p, "utf8"); } catch { return null; }
}
function humanPercent(num) { return Math.max(0, Math.min(100, Math.round(num))); }

// ---------- RAM ----------
async function readMem() {
    const txt = await readFile(`${PROC}/meminfo`);
    if (!txt) return null;
    const map = {};
    for (const line of txt.split("\n")) {
        const [k, v] = line.split(":");
        if (!k || !v) continue;
        map[k.trim()] = parseInt(v, 10) * 1024; // kB -> B
    }
    const total = map.MemTotal || 0;
    const free  = (map.MemFree || 0) + (map.Buffers || 0) + (map.Cached || 0);
    const used  = Math.max(0, total - free);
    return { total, used, percent: total ? humanPercent((used / total) * 100) : 0 };
}

// ---------- Load & Uptime ----------
async function readLoadUptime() {
    const loadTxt = await readFile(`${PROC}/loadavg`);
    const upTxt   = await readFile(`${PROC}/uptime`);
    let load = [0,0,0], uptime = { days:0, hours:0, mins:0 };
    if (loadTxt) {
        const [a,b,c] = loadTxt.trim().split(/\s+/).slice(0,3).map(Number);
        load = [a,b,c];
    }
    if (upTxt) {
        const sec = Math.floor(parseFloat(upTxt.trim().split(/\s+/)[0]));
        uptime = { days: Math.floor(sec/86400), hours: Math.floor(sec%86400/3600), mins: Math.floor(sec%3600/60) };
    }
    return { load, uptime };
}

// ---------- Disks (vom Host) ----------
async function readDisks() {
    // mounts vom Host lesen und Relevantes herausfiltern
    const m = await readFile(`${PROC}/mounts`);
    if (!m) return [];
    const rows = [];
    const skipTypes = new Set(["proc","sysfs","cgroup","cgroup2","tmpfs","devtmpfs","overlay","squashfs","ramfs","securityfs","pstore","bpf","tracefs","fusectl"]);
    for (const line of m.split("\n")) {
        if (!line) continue;
        const [src, tgt, fstype] = line.split(/\s+/);
        if (!src || !tgt || !fstype) continue;
        if (skipTypes.has(fstype)) continue;
        if (!/^\/dev\//.test(src)) continue;        // echte Blockdevices
        // df auf Host-Pfad
        try {
            const { stdout } = await sh(`df -P -B1 --output=pcent,size,target ${HOST}${tgt} | tail -n 1`);
            const [pcent, size, target] = stdout.trim().split(/\s+/);
            rows.push({
                src,
                mount: tgt,
                size: parseInt(size,10),
                usedPercent: parseInt(pcent,10),
            });
        } catch {}
    }
    // Doppelte Mounts (z.B. Subvols) konsolidieren auf einmal pro Quelle
    const dedup = new Map();
    for (const r of rows) {
        const key = `${r.src}`;
        if (!dedup.has(key) || r.usedPercent > dedup.get(key).usedPercent) dedup.set(key, r);
    }
    return Array.from(dedup.values()).sort((a,b)=>a.src.localeCompare(b.src));
}

// ---------- Temperaturen ----------
async function readTemps() {
    let cpu = null;
    // hwmon aus SYS lesen (funktioniert ohne lm-sensors)
    try {
        const hwmons = await fs.readdir(`${SYS}/class/hwmon`);
        let best = null;
        for (const h of hwmons) {
            const dir = `${SYS}/class/hwmon/${h}`;
            const name = (await readFile(`${dir}/name`))?.trim() || "";
            const entries = await fs.readdir(dir);
            for (const e of entries) {
                if (!/^temp[0-9]+_input$/.test(e)) continue;
                const vTxt = await readFile(`${dir}/${e}`);
                const millic = parseInt(vTxt, 10);
                if (!isNaN(millic)) {
                    const c = Math.round(millic / 1000);
                    if (name.match(/(k10temp|coretemp|cpu)/i)) best = c;
                }
            }
        }
        if (best != null) cpu = `${best}°C`;
    } catch {}
    // HDD Temps via smartctl (optional, nur wenn installiert & /dev gemountet)
    const disks = [];
    try {
        const { stdout } = await sh(`ls -1 ${HOST}/dev | egrep '^(sd[a-z]|nvme[0-9]+n[0-9]+)$' || true`);
        const devs = stdout.trim().split("\n").filter(Boolean);
        for (const d of devs) {
            try {
                const { stdout: s } = await sh(`smartctl -A /host/dev/${d} 2>/dev/null | egrep '194|190' | awk '{print $10}' | tail -n1`);
                const t = parseInt(s, 10);
                if (!isNaN(t)) disks.push({ device: `/dev/${d}`, tempC: t });
            } catch {}
        }
    } catch {}
    return { cpu, disks };
}

// ---------- OMV Versionen/Plugins (dpkg-Status vom Host parsen) ----------
async function readOMV() {
    const status = await readFile(`${DPKG}/status`);
    if (!status) return { omv: null, plugins: [] };
    const blocks = status.split("\n\n");
    let omv = null; const plugins = [];
    for (const b of blocks) {
        const pkg = b.match(/^Package:\s*(.+)$/m)?.[1]?.trim();
        if (!pkg) continue;
        const ver = b.match(/^Version:\s*(.+)$/m)?.[1]?.trim();
        if (!ver) continue;
        if (pkg === "openmediavault") omv = ver;
        else if (pkg.startsWith("openmediavault-")) {
            plugins.push({ name: pkg.replace(/^openmediavault-/, ""), version: ver });
        }
    }
    return { omv, plugins };
}

// ---------- Docker Updates ----------
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

// ---------- Exportierte Aggregation ----------
async function getStats() {
    const [mem, lu, disks, temps, omv, docker] = await Promise.all([
        readMem(),
        readLoadUptime(),
        readDisks(),
        readTemps(),
        readOMV(),
        readDockerUpdates(),
    ]);
    return {
        ts: Date.now(),
        ram: mem || { total:0, used:0, percent:0 },
        load: lu.load,
        uptime: lu.uptime,
        disks,
        temps,
        versions: omv,
        docker,
    };
}

module.exports = { getStats };
