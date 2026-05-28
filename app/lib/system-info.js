const {exec} = require("child_process");
const {promisify} = require("util");

const sh = promisify(exec);

const {EXE_OPTS, hostCmd} = require("./host-runtime");

function parseDmidecodeMemory(text) {
    const out = [];
    const src = String(text || "");
    const devices = src.split(/\n(?=Handle .*DMI type 17,)/g);

    for (const dev of devices) {
        if (!/DMI type 17\b/.test(dev)) continue;

        const mSize = dev.match(/^\s*Size:\s*(.+)$/mi);
        const size = (mSize && mSize[1] ? mSize[1].trim() : "");
        if (!size || /^no module/i.test(size)) continue;

        const mLoc = dev.match(/^\s*Locator:\s*(.+)$/mi);
        const mBank = dev.match(/^\s*Bank Locator:\s*(.+)$/mi);
        const locator = ((mLoc && mLoc[1]) || (mBank && mBank[1]) || "").trim();

        let speed = "";
        const mCfg = dev.match(/^\s*Configured Memory Speed:\s*(.+)$/mi);
        const mSpd = dev.match(/^\s*Speed:\s*(.+)$/mi);
        if (mCfg && mCfg[1]) speed = mCfg[1].trim();
        else if (mSpd && mSpd[1]) speed = mSpd[1].trim();

        const manufacturer = ((dev.match(/^\s*Manufacturer:\s*(.+)$/mi) || [])[1] || "").trim();
        const part = ((dev.match(/^\s*Part Number:\s*(.+)$/mi) || [])[1] || "").trim();
        const serial = ((dev.match(/^\s*Serial Number:\s*(.+)$/mi) || [])[1] || "").trim();

        out.push({slot: locator, size, speed, manufacturer, part, serial});
    }

    return out;
}

function parseLshwMemory(text) {
    const lines = String(text || "").split(/\r?\n/);
    const out = [];

    let inBank = false;
    let slot = "";
    let size = "";
    let manufacturer = "";
    let serial = "";

    const pushIfComplete = () => {
        const normalizedSize = size.trim();
        if (!normalizedSize || /^empty$/i.test(normalizedSize)) return;
        if (/cache$/i.test(slot || "")) return;

        out.push({
            slot: slot.trim(),
            size: normalizedSize,
            manufacturer: manufacturer.trim(),
            serial: serial.trim()
        });
    };

    for (const raw of lines) {
        const nodeStart = raw.match(/^\s*\*-(\S+):/);
        if (nodeStart) {
            const kind = nodeStart[1].toLowerCase();
            if (inBank) {
                pushIfComplete();
                inBank = false;
            }
            if (kind === "bank" || kind.startsWith("bank")) {
                inBank = true;
                slot = "";
                size = "";
                manufacturer = "";
                serial = "";
            }
            continue;
        }

        if (!inBank) continue;

        let match;
        if ((match = raw.match(/^\s*slot:\s*(.+)$/i))) {
            slot = match[1].trim();
            continue;
        }
        if ((match = raw.match(/^\s*size:\s*(.+)$/i))) {
            size = match[1].trim();
            continue;
        }
        if ((match = raw.match(/^\s*vendor:\s*(.+)$/i))) {
            manufacturer = match[1].trim();
            continue;
        }
        if ((match = raw.match(/^\s*serial:\s*(.+)$/i))) {
            serial = match[1].trim();
        }
    }

    if (inBank) pushIfComplete();

    return out;
}

function formatBytes(bytes) {
    const units = ["B", "KB", "MB", "GB", "TB", "PB"];
    let index = 0;
    let value = bytes;

    while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index++;
    }

    return (value >= 10 ? value.toFixed(0) : value.toFixed(1)) + " " + units[index];
}

async function readSystemInfo() {
    const [{stdout: h1}, {stdout: os1}, {stdout: k1}, {stdout: c1}, {stdout: g1}] = await Promise.all([
        sh(`${hostCmd("/bin/cat /etc/hostname")} || ${hostCmd("/bin/cat /proc/sys/kernel/hostname")}`, EXE_OPTS),
        sh(hostCmd(`/bin/bash -lc "grep PRETTY_NAME /etc/os-release | cut -d= -f2 | tr -d '\\\"'"`), EXE_OPTS),
        sh(hostCmd("/bin/uname -r"), EXE_OPTS),
        sh(hostCmd(`/bin/bash -lc "grep 'model name' /proc/cpuinfo | head -1 | cut -d: -f2- | sed 's/^ //'"`), EXE_OPTS),
        sh(hostCmd(`/bin/bash -lc "lspci | grep -i 'vga\\|3d' | cut -d: -f3- | sed 's/^ //'"`), EXE_OPTS).catch(() => ({stdout: ""}))
    ]);

    const host = String(h1 || "").trim();
    const os = String(os1 || "").trim();
    const kernel = String(k1 || "").trim();
    const cpu = String(c1 || "").trim();
    const gpu = String(g1 || "").trim();

    let ram = [];
    let ramtool = "";

    try {
        const {stdout: dmiOut} = await sh(`${hostCmd("/usr/sbin/dmidecode -t memory")} 2>/dev/null || true`, EXE_OPTS);
        const dmi = String(dmiOut || "");
        if (dmi && /DMI type 17\b/i.test(dmi)) {
            const parsed = parseDmidecodeMemory(dmi);
            if (parsed.length > 0) {
                ram = parsed;
                ramtool = "dmidecode";
            }
        }
    } catch {
        console.error("Dmidecode failed.");
    }

    if (!ram.length) {
        try {
            const {stdout: jraw} = await sh(
                hostCmd(`/bin/bash -lc "command -v lshw >/dev/null 2>&1 && lshw -quiet -json -class memory 2>/dev/null || true"`),
                EXE_OPTS
            );

            let parsed = [];
            if (jraw && jraw.trim().startsWith("{")) {
                try {
                    const jobj = JSON.parse(jraw);
                    const banks = [];

                    (function walk(node) {
                        if (!node || typeof node !== "object") return;
                        if (node.id && /^bank:/i.test(String(node.id))) banks.push(node);
                        if (Array.isArray(node.children)) node.children.forEach(walk);
                    })(jobj);

                    parsed = banks.map((bank) => {
                        const slot =
                            (bank.slot && String(bank.slot)) ||
                            (bank.id && String(bank.id).replace(/^bank:/i, "").trim()) ||
                            "";
                        const manufacturer = (bank.vendor && String(bank.vendor)) || "";
                        const serial = (bank.serial && String(bank.serial)) || "";
                        let size = "";

                        if (bank.size != null) {
                            const bytes = Number(bank.size);
                            if (Number.isFinite(bytes) && bytes > 0) {
                                size = formatBytes(bytes);
                            } else {
                                size = String(bank.size);
                            }
                        } else if (bank.description) {
                            size = String(bank.description);
                        }

                        return size ? {slot, size, manufacturer, serial} : null;
                    }).filter(Boolean);
                } catch {
                    console.error("lshw failed.");
                }
            }

            if (!parsed.length) {
                const {stdout: traw} = await sh(`${hostCmd("/usr/bin/lshw -quiet -class memory")} 2>/dev/null || true`, EXE_OPTS);
                parsed = parseLshwMemory(traw);
            }

            if (parsed.length) {
                ram = parsed;
                ramtool = "lshw";
            }
        } catch {
            console.error("lshw not installed.");
        }
    }

    return {host, os, kernel, cpu, gpu, ram, ramtool};
}

module.exports = {
    readSystemInfo,
    _internals: {
        parseDmidecodeMemory,
        parseLshwMemory
    }
};
