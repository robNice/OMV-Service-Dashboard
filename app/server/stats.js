// server/stats.js
const { exec } = require("child_process");
const { promisify } = require("util");
const sh = promisify(exec);

async function readMem() {
    const { stdout } = await sh("cat /proc/meminfo");
    const m = {};
    stdout.split(/\n/).forEach(l => {
        const [k, v] = l.split(":");
        if (!k || !v) return;
        m[k.trim()] = parseInt(v, 10); // kB
    });
    const total = m.MemTotal * 1024;
    const free = (m.MemFree + m.Buffers + m.Cached) * 1024;
    const used = total - free;
    return {
        total,
        used,
        percent: Math.round((used / total) * 100),
    };
}

async function readLoadUptime() {
    const [load, up] = await Promise.all([
        sh("cat /proc/loadavg"),
        sh("cat /proc/uptime"),
    ]);
    const [l1, l5, l15] = load.stdout.trim().split(" ").slice(0, 3).map(Number);
    const upsec = Math.floor(parseFloat(up.stdout.trim().split(" ")[0]));
    const days = Math.floor(upsec / 86400);
    const hours = Math.floor((upsec % 86400) / 3600);
    const mins = Math.floor((upsec % 3600) / 60);
    return { load: [l1, l5, l15], uptime: { days, hours, mins } };
}

async function readDisks() {
    // Alle gemounteten Blockdevices
    const { stdout } = await sh("df -P -B1 --output=source,pcent,size,target | tail -n +2");
    const lines = stdout.trim().split("\n").filter(Boolean);
    const rows = lines.map(l => {
        const parts = l.trim().split(/\s+/);
        const [src, pcent, size, target] = parts;
        return { src, usedPercent: parseInt(pcent, 10), size: parseInt(size, 10), mount: target };
    });
    // Nur echte Platten (sda, sdb, nvme, md) und große Mounts
    return rows.filter(r => /^\/dev\/(sd|nvme|md)/.test(r.src));
}

async function readTemps() {
    // CPU via 'sensors', HDD via smartctl falls verfügbar
    let cpu = null;
    try {
        const { stdout } = await sh("sensors 2>/dev/null | grep -m1 -Eo '[+]?[0-9]+\\.?[0-9]*°C'");
        if (stdout) cpu = stdout.trim();
    } catch (_) {}
    const disks = [];
    try {
        const { stdout } = await sh("lsblk -ndo NAME,TYPE | awk '$2==\"disk\"{print \"/dev/\"$1}'");
        const devs = stdout.trim().split("\n").filter(Boolean);
        for (const d of devs) {
            try {
                const { stdout: s } = await sh(`smartctl -A ${d} 2>/dev/null | egrep '194|190' | awk '{print $10}' | tail -n1`);
                const t = parseInt(s, 10);
                if (!isNaN(t)) disks.push({ device: d, tempC: t });
            } catch (_) {}
        }
    } catch (_) {}
    return { cpu, disks };
}

async function readOMV() {
    // OMV-Version + Plugins aus dpkg
    let omv = null;
    const plugins = [];
    try {
        const { stdout } = await sh(`dpkg-query -W -f='${'${Package} ${Version}\\n'}' 'openmediavault*' 2>/dev/null`);
        stdout.trim().split("\n").forEach(line => {
            const [pkg, ver] = line.trim().split(/\s+/);
            if (!pkg || !ver) return;
            if (pkg === "openmediavault") omv = ver;
            else if (pkg.startsWith("openmediavault-")) plugins.push({ name: pkg.replace(/^openmediavault-/, ''), version: ver });
        });
    } catch (_) {}
    return { omv, plugins };
}

async function readDockerUpdates() {
    // Für laufende Container: Image vergleichen mit remote (pull nur Manifest)
    // Achtung: benötigt /var/run/docker.sock im Container + Docker CLI
    const out = { updates: [], total: 0 };
    try {
        const { stdout } = await sh("docker ps --format '{{.Names}}|{{.Image}}'");
        const lines = stdout.trim().split("\n").filter(Boolean);
        for (const line of lines) {
            const [name, image] = line.split("|");
            try {
                const { stdout: before } = await sh(`docker image inspect --format='{{.Id}}' ${image}`);
                await sh(`docker pull -q ${image}`); // lädt nur neuere Layer, falls vorhanden
                const { stdout: after } = await sh(`docker image inspect --format='{{.Id}}' ${image}`);
                const changed = before.trim() !== after.trim();
                if (changed) out.updates.push({ container: name, image, current: before.trim(), latest: after.trim() });
            } catch (_) {
                // ignore single image failures
            }
        }
        out.total = out.updates.length;
    } catch (_) {}
    return out;
}

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
        ram: mem,
        load: lu.load,
        uptime: lu.uptime,
        disks,
        temps,
        versions: omv,
        docker,
    };
}

module.exports = { getStats };
