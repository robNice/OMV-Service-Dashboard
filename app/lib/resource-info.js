const {PROC, SYS, readFileSafe, readdirSafe} = require("./host-runtime");

const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);

async function readMem() {
    const txt = await readFileSafe(`${PROC}/meminfo`);
    if (!txt) return {total: 0, used: 0, percent: 0};

    const map = {};
    for (const line of txt.split("\n")) {
        const [key, value] = line.split(":");
        if (!key || !value) continue;
        map[key.trim()] = parseInt(value, 10) * 1024;
    }

    const total = map.MemTotal || 0;
    const free = (map.MemFree || 0) + (map.Buffers || 0) + (map.Cached || 0);
    const used = Math.max(0, total - free);

    return {
        total,
        used,
        percent: total ? pct(used, total) : 0
    };
}

async function readLoadUptime() {
    const loadTxt = await readFileSafe(`${PROC}/loadavg`);
    const upTxt = await readFileSafe(`${PROC}/uptime`);
    let load = [0, 0, 0];
    let uptime = {days: 0, hours: 0, mins: 0};

    if (loadTxt) {
        const [a, b, c] = loadTxt.trim().split(/\s+/).slice(0, 3).map(Number);
        load = [a || 0, b || 0, c || 0];
    }

    if (upTxt) {
        const sec = Math.floor(parseFloat(upTxt.trim().split(/\s+/)[0]) || 0);
        uptime = {
            days: Math.floor(sec / 86400),
            hours: Math.floor((sec % 86400) / 3600),
            mins: Math.floor((sec % 3600) / 60)
        };
    }

    return {load, uptime};
}

async function readTempsCpuChassis() {
    let cpu = null;

    try {
        const hwmons = await readdirSafe(`${SYS}/class/hwmon`);
        let best = null;

        for (const hwmon of hwmons) {
            const dir = `${SYS}/class/hwmon/${hwmon}`;
            const name = (await readFileSafe(`${dir}/name`))?.trim().toLowerCase() || "";
            const files = await readdirSafe(dir);

            for (const file of files) {
                if (!/^temp[0-9]+_input$/.test(file)) continue;
                const vTxt = await readFileSafe(`${dir}/${file}`);
                const millic = parseInt(vTxt, 10);
                if (!Number.isNaN(millic)) {
                    const c = Math.round(millic / 1000);
                    if (name.match(/(k10temp|coretemp|cpu|zenpower)/)) {
                        best = c;
                    }
                }
            }
        }

        if (best != null) {
            cpu = `${best}°C`;
        }
    } catch {
    }

    const chassis = [];

    try {
        const hwmons = await readdirSafe(`${SYS}/class/hwmon`);
        for (const hwmon of hwmons) {
            const dir = `${SYS}/class/hwmon/${hwmon}`;
            const name = (await readFileSafe(`${dir}/name`))?.trim().toLowerCase() || "";
            if (!name.match(/(acpitz|pch|motherboard|system|chassis)/)) continue;

            const files = await readdirSafe(dir);
            for (const file of files) {
                if (!/^temp[0-9]+_input$/.test(file)) continue;
                const vTxt = await readFileSafe(`${dir}/${file}`);
                const millic = parseInt(vTxt, 10);
                if (!Number.isNaN(millic)) {
                    chassis.push({label: name, tempC: Math.round(millic / 1000)});
                }
            }
        }
    } catch {
    }

    return {cpu, chassis};
}

module.exports = {
    readMem,
    readLoadUptime,
    readTempsCpuChassis
};
