// server/stats.js  — Host-Stats für OMV-Landingpage
// Liest Host-Daten über gemountete Roots (PROC_ROOT, SYS_ROOT, HOST_ROOT, DPKG_ROOT)
// Disks: robust via statfs (Node 20+). Fallback: df.

const fs = require("fs/promises");
const { exec } = require("child_process");
const { promisify } = require("util");
const sh = promisify(exec);

const PROC = process.env.PROC_ROOT || "/host/proc";
const SYS  = process.env.SYS_ROOT  || "/host/sys";
const HOST = process.env.HOST_ROOT || "/hostroot";
const DPKG = process.env.DPKG_ROOT || "/host/var/lib/dpkg";

// ---------- helpers ----------
async function readFile(p) { try { return await fs.readFile(p, "utf8"); } catch { return null; } }
function clampPct(v) { return Math.max(0, Math.min(100, Math.round(v))); }
function uniqBy(arr, keyFn) { const m = new Map(); for (const x of arr) { const k = keyFn(x); if (!m.has(k)) m.set(k, x); } return [...m.values()]; }

// ---------- RAM ----------
async function readMem() {
    const txt = await readFile(`${PROC}/meminfo`);
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
    return { total, used, percent: total ? clampPct((used / total) * 100) : 0 };
}

// ---------- Load & Uptime ----------
async function readLoadUptime() {
    const loadTxt = await readFile(`${PROC}/loadavg`);
    const upTxt   = await readFile(`${PROC}/uptime`);
    let load = [0, 0, 0], uptime = { days: 0, hours: 0, mins: 0 };
    if (loadTxt) {
        const [a, b, c] = loadTxt.trim().split(/\s+/).slice(0, 3).map(Number);
        load = [a || 0, b || 0, c || 0];
    }
    if (upTxt) {
        const sec = Math.floor(parseFloat(upTxt.trim().split(/\s+/)[0]) || 0);
        uptime = { days: Math.floor(sec / 86400), hours: Math.floor((sec % 86400) / 3600), mins: Math.floor((sec % 3600) / 60) };
    }
    return { load, uptime };
}

// ---------- Disks (Host) ----------
async function readDisks() {
    const mountsTxt = await readFile(`${PROC}/mounts`);
    if (!mountsTxt) return [];

    const skipTypes = new Set([
        "proc","sysfs","cgroup","cgroup2","tmpfs","devtmpfs","overlay","squashfs","ramfs",
        "securityfs","pstore","bpf","tracefs","fusectl","debugfs","configfs","aufs"
    ]);

    // Kandidaten aus /proc/mounts
    const candidates = [];
    for (const line of mountsTxt.split("\n")) {
        if (!line) continue;
        const [src, tgt, fstype] = line.split(/\s+/);
        if (!src || !tgt || !fstype) continue;
        if (skipTypes.has(fstype)) continue;
        if (!/^\/dev\//.test(src)) continue;              // nur echte Blockdevices
        candidates.push({ src, tgt, fstype });
    }

    // Doppelte Geräte (Subvols etc.) vorerst zulassen – wir deduplizieren später
    const out = [];
    for (const { src, tgt } of candidates) {
        const hostPath = `${HOST}${tgt}`;                 // echter Pfad auf dem Host-Dateisystem
        let size = null, usedPercent = null;

        // 1) Versuch: statfs (am zuverlässigsten, kein Parsing, unabhängig von df-Ausgabe)
        try {
            // @ts-ignore — Node 20+: statfs verfügbar
            const st = await fs.statfs(hostPath);
            const block = st?.bsize || st?.frsize || 4096;
            const total = Number(st.blocks || st.bavail || 0) * Number(block);
            const free  = Number(st.bfree || 0) * Number(block);
            const used  = total - free;
            if (total > 0) {
                size = total;
                usedPercent = clampPct((used / total) * 100);
            }
        } catch {
            // 2) Fallback: df
            try {
                const { stdout } = await sh(`df -P -B1 --output=pcent,size ${hostPath} | tail -n 1`);
                // Format: "  73%  3600755083264"
                const parts = stdout.trim().split(/\s+/);
                const pcent = parts[0] || "";
                const sz    = parts[1] || "";
                const pVal  = parseInt(pcent.replace("%", ""), 10);
                const sVal  = parseInt(sz, 10);
                if (!Number.isNaN(sVal) && sVal > 0) size = sVal;
                if (!Number.isNaN(pVal)) usedPercent = clampPct(pVal);
            } catch { /* ignorieren */ }
        }

        // Wenn statfs/df nichts sinnvoll liefert (bind mounts, special), überspringen
        if (size === null || usedPercent === null) continue;

        out.push({ src, mount: tgt, size, usedPercent });
    }

    // Auf Geräteebene deduplizieren – nehme den Eintrag mit der höchsten Belegung
    const dedup = new Map();
    for (const r of out) {
        const key = r.src;
        if (!dedup.has(key) || r.usedPercent > dedup.get(key).usedPercent) dedup.set(key, r);
    }
    return Array.from(dedup.values()).sort((a, b) => a.src.localeCompare(b.src));
}

// ---------- Temperaturen ----------
async function readTemps() {
    let cpu = null;
    // hwmon direkt lesen (funktioniert ohne sensors-Binary)
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

    // HDD/NVMe Temperaturen via smartctl (optional)
    const disks = [];
    try {
        const { stdout } = await sh(`ls -1 ${HOST}/dev | egrep '^(sd[a-z]|nvme[0-9]+n[0-9]+)$' || true`);
        const devs = stdout.trim().split("\n").filter(Boolean);
        for (const d of devs) {
            try {
                const { stdout: s } = await sh(`smartctl -A /host/dev/${d} 2>/dev/null | egrep '194|190|Temperature_Celsius' | awk '{print $10}' | tail -n1`);
                const t = parseInt(String(s).trim(), 10);
                if (!isNaN(t)) disks.push({ device: `/dev/${d}`, tempC: t });
            } catch {}
        }
    } catch {}

    return { cpu, disks };
}

// ---------- OMV Versionen/Plugins ----------
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
        else if (pkg.startsWith("openmediavault-")) plugins.push({ name: pkg.replace(/^openmediavault-/, ""), version: ver });
    }
    return { omv, plugins: uniqBy(plugins, p => p.name).sort((a,b) => a.name.localeCompare(b.name)) };
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
                await sh(`docker pull -q ${image}`); // nur Digest/Layers ziehen, kein Restart
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

// ---------- Aggregation ----------
async function getStats() {
    const [{ load, uptime }, ram, disks, temps, versions, docker] = await Promise.all([
        readLoadUptime(),
        readMem(),
        readDisks(),
        readTemps(),
        readOMV(),
        readDockerUpdates(),
    ]);

    return {
        ts: Date.now(),
        ram,
        load,
        uptime,
        disks,
        temps,
        versions,
        docker,
    };
}

module.exports = { getStats };
