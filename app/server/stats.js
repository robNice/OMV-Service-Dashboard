// server/stats.js — stabile Host-Stats für die OMV-Landingpage
// Liest Host-Daten über gemountete Roots (PROC_ROOT, SYS_ROOT, HOST_ROOT, DPKG_ROOT)
// Disks via /proc/1/mountinfo (Host) + statfs auf Host-Pfad.

const fs = require("fs/promises");
const { exec } = require("child_process");
const { promisify } = require("util");
const sh = promisify(exec);

const PROC = process.env.PROC_ROOT || "/host/proc";           // Host-Proc (eingebunden als /proc:/host/proc:ro)
const SYS  = process.env.SYS_ROOT  || "/host/sys";            // Host-Sys (eingebunden als /sys:/host/sys:ro)
const HOST = process.env.HOST_ROOT || "/hostroot";            // Host-Root (eingebunden als /:/hostroot:ro,rslave)
const DPKG = process.env.DPKG_ROOT || "/host/var/lib/dpkg";   // Host-dpkg-Status

async function readFile(p) { try { return await fs.readFile(p, "utf8"); } catch { return null; } }
function clampPct(v) { return Math.max(0, Math.min(100, Math.round(v))); }
function uniqBy(arr, keyFn) { const m = new Map(); for (const x of arr) { const k = keyFn(x); if (!m.has(k)) m.set(k, x); } return [...m.values()]; }

// ------- RAM -------
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

// ------- Load & Uptime -------
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

// ------- Disks via Host /proc/1/mountinfo + statfs -------
async function readDisks() {
    const mi = await readFile(`${PROC}/1/mountinfo`);
    if (!mi) return [];

    const skipFSTypes = new Set([
        "proc","sysfs","cgroup","cgroup2","tmpfs","devtmpfs","overlay","squashfs","ramfs",
        "securityfs","pstore","bpf","tracefs","fusectl","debugfs","configfs","aufs","mqueue","hugetlbfs","rpc_pipefs"
    ]);
    const skipMountPrefix = [
        "/proc", "/sys", "/dev", "/run", "/var/lib/docker", "/var/lib/containers",
        "/var/lib/kubelet", "/snap", "/boot/efi"
    ];

    const entries = [];
    for (const line of mi.split("\n")) {
        if (!line) continue;
        // mountinfo-Format: prefields ... - fstype source superopts
        const idx = line.indexOf(" - ");
        if (idx === -1) continue;
        const pre = line.slice(0, idx).split(" ");
        const post = line.slice(idx + 3).split(" ");
        // pre: 0:id 1:parent 2:major:minor 3:root 4:mountpoint 5:opts ...
        const mountPoint = pre[4];
        const fstype = post[0];
        const source = post[1]; // z. B. /dev/sda1

        if (!mountPoint || !fstype || !source) continue;
        if (skipFSTypes.has(fstype)) continue;
        if (!source.startsWith("/dev/")) continue;
        if (skipMountPrefix.some(p => mountPoint === p || mountPoint.startsWith(p + "/"))) continue;

        entries.push({ src: source, mount: mountPoint, fstype });
    }

    // statfs für jeden Host-Mount ermitteln
    const out = [];
    for (const e of entries) {
        const hostPath = `${HOST}${e.mount}`;
        try {
            // Node 20+: fs.statfs
            const st = await fs.statfs(hostPath);
            const block = st?.bsize || st?.frsize || 4096;
            const total = Number(st.blocks || 0) * block;
            const free  = Number(st.bfree || 0) * block;
            const used  = total - free;
            if (total > 0) {
                out.push({
                    src: e.src,
                    mount: e.mount,         // echter Host-Mountpoint
                    size: total,
                    usedPercent: clampPct((used / total) * 100),
                });
            }
        } catch {
            // Fallback auf df, falls statfs auf bind-mounts scheitert
            try {
                const { stdout } = await sh(`df -P -B1 --output=pcent,size ${hostPath} | tail -n 1`);
                const parts = stdout.trim().split(/\s+/);
                const pcent = parseInt(parts[0].replace("%",""), 10);
                const size  = parseInt(parts[1], 10);
                if (!isNaN(size) && !isNaN(pcent)) {
                    out.push({
                        src: e.src,
                        mount: e.mount,
                        size,
                        usedPercent: clampPct(pcent),
                    });
                }
            } catch { /* ignore */ }
        }
    }

    // pro Device konsolidieren (falls mehrere Mounts desselben Devices existieren)
    const bestBySrc = new Map();
    for (const d of out) {
        const prev = bestBySrc.get(d.src);
        if (!prev || d.size > prev.size) bestBySrc.set(d.src, d);
    }
    return Array.from(bestBySrc.values()).sort((a, b) => a.src.localeCompare(b.src));
}

// ------- Temperaturen -------
// ------- Temperaturen (CPU + HDDs erweitert) -------
// ------- Temperaturen (CPU + HDDs via smartctl --json) -------
// ------- Temperaturen (CPU + HDDs via smartctl + sysfs/hwmon mapping) -------
async function readTemps() {
    const realpath = async (p) => {
        try { return await fs.realpath(p); } catch { return null; }
    };
    const readDir = async (p) => {
        try { return await fs.readdir(p); } catch { return []; }
    };
    const read = async (p) => {
        try { return await fs.readFile(p, "utf8"); } catch { return null; }
    };

    // --- CPU-Temperatur über hwmon ---
    let cpu = null;
    try {
        const hwmons = await readDir(`${SYS}/class/hwmon`);
        let best = null;
        for (const h of hwmons) {
            const dir = `${SYS}/class/hwmon/${h}`;
            const name = (await read(`${dir}/name`))?.trim() || "";
            const files = await readDir(dir);
            for (const f of files) {
                if (!/^temp[0-9]+_input$/.test(f)) continue;
                const vTxt = await read(`${dir}/${f}`);
                const millic = parseInt(vTxt, 10);
                if (!isNaN(millic)) {
                    const c = Math.round(millic / 1000);
                    if (name.match(/(k10temp|coretemp|cpu|zenpower)/i)) best = c;
                }
            }
        }
        if (best != null) cpu = `${best}°C`;
    } catch {}

    // --- 1) Disk-Temps per smartctl --json (SATA/NVMe, wenn verfügbar) ---
    const smartTemps = new Map(); // "/dev/sdX" -> tempC
    try {
        const { stdout } = await sh(`lsblk -dn -o NAME,TYPE | awk '$2=="disk"{print "/dev/"$1}'`);
        const devs = stdout.trim().split("\n").filter(Boolean);

        async function smartTemp(dev) {
            try {
                const { stdout } = await sh(`smartctl -a --json ${dev} 2>/dev/null`);
                const j = JSON.parse(stdout);

                // NVMe
                if (j.nvme_smart_health_information_log &&
                    typeof j.nvme_smart_health_information_log.temperature === "number") {
                    return j.nvme_smart_health_information_log.temperature;
                }
                // General
                if (j.temperature && typeof j.temperature.current === "number") {
                    return j.temperature.current;
                }
                // ATA attributes (190/194)
                const tbl = j.ata_smart_attributes && j.ata_smart_attributes.table;
                if (Array.isArray(tbl)) {
                    for (const a of tbl) {
                        if (a.id === 194 || a.id === 190) {
                            const rawv = (a.raw && typeof a.raw.value !== "undefined")
                                ? Number(a.raw.value) : Number(a.value);
                            if (!Number.isNaN(rawv)) return rawv;
                        }
                    }
                }
            } catch {}
            return null;
        }

        const vals = await Promise.all(devs.map(async d => [d, await smartTemp(d)]));
        for (const [dev, t] of vals) if (typeof t === "number") smartTemps.set(dev, t);
    } catch {}

    // --- 2) sysfs/hwmon Fallback → ordnet hwmon-Sensoren dem Blockdevice zu ---
    // Idee: /sys/class/hwmon/hwmon*/device -> realpath
    //       /sys/class/block/<dev>/device -> realpath
    // Wenn gleich/Prefix, dann gehört Sensor zu dem Blockdevice.
    const sysfsTemps = new Map();
    try {
        const hwmons = await readDir(`${SYS}/class/hwmon`);
        // baue Map: realpath(/sys/class/hwmon/hwmonX/device) -> Temperatur in °C
        const sensorByDevPath = new Map();
        for (const h of hwmons) {
            const dir = `${SYS}/class/hwmon/${h}`;
            const name = (await read(`${dir}/name`))?.trim().toLowerCase() || "";
            // nur Kandidaten, die typischerweise zu Laufwerken gehören
            if (!name.match(/(drivetemp|nvme|sata|ahci|scsi|ata|disk)/)) continue;

            const devPath = await realpath(`${dir}/device`);
            if (!devPath) continue;

            // sammle einen sinnvollen Temperaturwert aus temp*_input
            const files = await readDir(dir);
            let tempC = null;
            for (const f of files) {
                if (!/^temp[0-9]+_input$/.test(f)) continue;
                const vTxt = await read(`${dir}/${f}`);
                const millic = parseInt(vTxt, 10);
                if (!isNaN(millic)) {
                    const c = Math.round(millic / 1000);
                    // nimm den höchsten/letzten gefundenen Wert als Heuristik
                    tempC = c;
                }
            }
            if (tempC != null) sensorByDevPath.set(devPath, tempC);
        }

        // mappe auf Blockdevices
        const blocks = await readDir(`${SYS}/class/block`);
        for (const b of blocks) {
            if (!/^(sd[a-z]+|nvme\d+n\d+)$/.test(b)) continue;
            const blockDev = `/dev/${b}`;
            const blockDevPath = await realpath(`${SYS}/class/block/${b}/device`);
            if (!blockDevPath) continue;

            // direkter Treffer
            if (sensorByDevPath.has(blockDevPath)) {
                sysfsTemps.set(blockDev, sensorByDevPath.get(blockDevPath));
                continue;
            }
            // heuristisch: manche Pfade sind Eltern/Kind-Beziehungen → Prefix-Vergleich
            for (const [devPath, t] of sensorByDevPath.entries()) {
                if (blockDevPath.startsWith(devPath) || devPath.startsWith(blockDevPath)) {
                    sysfsTemps.set(blockDev, t);
                    break;
                }
            }
        }
    } catch {}

    // --- 3) Merge: bevorzugt SMART, sonst sysfs ---
    const diskMap = new Map();
    for (const [k, v] of sysfsTemps) diskMap.set(k, v);
    for (const [k, v] of smartTemps) diskMap.set(k, v); // SMART overwrites sysfs

    const disks = Array.from(diskMap.entries())
        .map(([device, tempC]) => ({ device, tempC }))
        .sort((a, b) => a.device.localeCompare(b.device));

    // --- Chassis/Board-Sensoren (wie gehabt) ---
    const chassis = [];
    try {
        const hwmons = await readDir(`${SYS}/class/hwmon`);
        for (const h of hwmons) {
            const dir = `${SYS}/class/hwmon/${h}`;
            const name = (await read(`${dir}/name`))?.trim().toLowerCase() || "";
            if (!name.match(/(acpitz|pch|motherboard|system|chassis)/)) continue;
            const files = await readDir(dir);
            for (const f of files) {
                if (!/^temp[0-9]+_input$/.test(f)) continue;
                const vTxt = await read(`${dir}/${f}`);
                const millic = parseInt(vTxt, 10);
                if (!isNaN(millic)) chassis.push({ label: name, tempC: Math.round(millic / 1000) });
            }
        }
    } catch {}

    return { cpu, disks, chassis };
}


// ------- OMV Versionen/Plugins -------
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

// ------- Docker Updates -------
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
                await sh(`docker pull -q ${image}`); // zieht nur neue Layer/Digest, kein Restart
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

// ------- Aggregation -------
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
