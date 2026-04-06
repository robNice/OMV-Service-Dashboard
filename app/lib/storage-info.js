const path = require("path");
const {exec} = require("child_process");
const {promisify} = require("util");

const sh = promisify(exec);

const {
    HOST,
    EXE_OPTS,
    hostCmd,
    statfsSafe
} = require("./host-runtime");

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function isPhysicalDisk(blockDevice) {
    if (!blockDevice || blockDevice.type !== "disk") return false;

    const name = String(blockDevice.name || "");
    if (!name) return false;
    if (/^(loop|ram|fd|sr|md|dm-)/.test(name)) return false;

    return true;
}

function normalizeDiskDevice(blockDevice) {
    const name = String(blockDevice?.name || "").trim();
    if (!name) return null;
    return `/dev/${name}`;
}

function getDiskModel(blockDevice) {
    const model = String(blockDevice?.model || "").trim();
    return model || null;
}

function inferSmartDeviceTypes(blockDevice) {
    const device = normalizeDiskDevice(blockDevice) || "";
    const transport = String(blockDevice?.tran || "").trim().toLowerCase();
    const candidates = [];

    if (transport === "usb") {
        candidates.push("sat", "scsi");
    }

    if (device.startsWith("/dev/nvme")) {
        candidates.push("nvme");
    }

    return Array.from(new Set(candidates.filter(Boolean)));
}

function parseSmartTemperature(info) {
    const directTemp = Number(info?.temperature?.current);
    if (Number.isFinite(directTemp)) {
        return Math.round(directTemp);
    }

    const nvmeTemp = Number(info?.nvme_smart_health_information_log?.temperature);
    if (Number.isFinite(nvmeTemp)) {
        return nvmeTemp > 200 ? Math.round(nvmeTemp - 273.15) : Math.round(nvmeTemp);
    }

    const scsiTemp = Number(info?.scsi_temperature?.current);
    if (Number.isFinite(scsiTemp)) {
        return Math.round(scsiTemp);
    }

    const ataTable = Array.isArray(info?.ata_smart_attributes?.table)
        ? info.ata_smart_attributes.table
        : [];
    for (const attr of ataTable) {
        const id = Number(attr?.id);
        const raw = Number(attr?.raw?.value);
        if ((id === 190 || id === 194) && Number.isFinite(raw)) {
            return Math.round(raw);
        }
    }

    return null;
}

function parseSmartStatus(info) {
    const ataAttributes = Array.isArray(info?.ata_smart_attributes?.table)
        ? info.ata_smart_attributes.table
        : [];

    const getAtaRawValue = (ids = [], names = []) => {
        for (const attr of ataAttributes) {
            const attrId = Number(attr?.id);
            const attrName = String(attr?.name || "").trim().toUpperCase();
            if ((ids.length && ids.includes(attrId)) || (names.length && names.includes(attrName))) {
                const raw = Number(attr?.raw?.value);
                if (Number.isFinite(raw)) {
                    return raw;
                }
            }
        }
        return 0;
    };

    const hasBadSectorSignals =
        getAtaRawValue([5], ["REALLOCATED_SECTOR_CT"]) > 0 ||
        getAtaRawValue([183], ["RUNTIME_BAD_BLOCK"]) > 0 ||
        getAtaRawValue([187], ["REPORTED_UNCORRECT"]) > 0 ||
        getAtaRawValue([196], ["REALLOCATED_EVENT_COUNT"]) > 0 ||
        getAtaRawValue([197], ["CURRENT_PENDING_SECTOR"]) > 0 ||
        getAtaRawValue([198], ["OFFLINE_UNCORRECTABLE"]) > 0;

    if (hasBadSectorSignals) {
        return "BAD SECTOR";
    }

    if (typeof info?.smart_status?.passed === "boolean") {
        return info.smart_status.passed ? "GOOD" : "FAILED";
    }

    if (typeof info?.scsi_smart_health_status?.passed === "boolean") {
        return info.scsi_smart_health_status.passed ? "GOOD" : "FAILED";
    }

    const text = String(
        info?.smart_status?.string ||
        info?.smart_status?.status ||
        info?.ata_smart_data?.self_test?.status?.string ||
        ""
    ).trim();

    if (!text) return "UNKNOWN";

    if (/passed|ok|healthy/i.test(text)) return "GOOD";
    if (/fail|bad|critical|error/i.test(text)) return "FAILED";
    if (/warn|prefail|degraded/i.test(text)) return "WARN";

    return text.toUpperCase();
}

function getSmartctlCommandCandidates(blockDevice) {
    const device = normalizeDiskDevice(blockDevice);
    const types = inferSmartDeviceTypes(blockDevice);
    const candidates = [[device]];

    for (const type of types) {
        candidates.push([device, type]);
    }

    return candidates;
}

async function runSmartctlJson(blockDevice) {
    const device = normalizeDiskDevice(blockDevice);
    if (!device) {
        return null;
    }

    const candidates = getSmartctlCommandCandidates(blockDevice);
    let lastError = null;

    for (const [currentDevice, deviceType] of candidates) {
        const args = ["-x", "-j"];
        if (deviceType) {
            args.push("-d", deviceType);
        }
        args.push(currentDevice);

        try {
            const {stdout} = await sh(`smartctl ${args.map(escapeShellArg).join(" ")}`, EXE_OPTS);
            const data = JSON.parse(stdout);
            return {
                device: currentDevice,
                deviceType: deviceType || null,
                data
            };
        } catch (error) {
            try {
                const data = JSON.parse(String(error.stdout || ""));
                return {
                    device: currentDevice,
                    deviceType: deviceType || null,
                    data
                };
            } catch {
            }
            lastError = error;
        }
    }

    if (lastError) {
        const stderr = String(lastError.stderr || "");
        const stdout = String(lastError.stdout || "");
        const combined = `${stdout}\n${stderr}`;
        if (/smartctl: not found|command not found/i.test(combined)) {
            return {device, deviceType: null, missingBinary: true, data: null};
        }
    }

    return {device, deviceType: null, data: null};
}

function escapeShellArg(value) {
    return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

async function readBlockDevices() {
    const commands = [
        `lsblk -J -b -o NAME,TYPE,SIZE,MODEL,MOUNTPOINT,TRAN`,
        hostCmd(`/bin/bash -lc "lsblk -J -b -o NAME,TYPE,SIZE,MODEL,MOUNTPOINT,TRAN"`)
    ];

    for (const cmd of commands) {
        try {
            const {stdout} = await sh(cmd, EXE_OPTS);
            const parsed = JSON.parse(stdout);
            if (Array.isArray(parsed?.blockdevices)) {
                return parsed.blockdevices;
            }
        } catch {
        }
    }

    return [];
}

async function readDriveUsageMap(blockDevices) {
    const usage = new Map();

    async function partUsage(mount) {
        const hostMount = path.posix.join(HOST, mount);
        const st = await statfsSafe(hostMount);
        if (!st) return {total: 0, used: 0};
        const blockSize = st.bsize || st.frsize || 4096;
        const total = Number(st.blocks || 0) * blockSize;
        const free = Number(st.bfree || 0) * blockSize;
        const used = Math.max(0, total - free);
        return {total, used};
    }

    async function walk(dev, parentDisk = null) {
        const diskPath = normalizeDiskDevice(dev);

        if (isPhysicalDisk(dev) && diskPath) {
            usage.set(diskPath, {
                sizeBytes: Number(dev.size || 0),
                usedBytes: 0
            });
            parentDisk = diskPath;
        }

        if (!Array.isArray(dev?.children)) {
            return;
        }

        for (const child of dev.children) {
            if (parentDisk && child.type === "part" && child.mountpoint && child.mountpoint !== "[SWAP]") {
                const part = await partUsage(child.mountpoint);
                const current = usage.get(parentDisk) || {sizeBytes: 0, usedBytes: 0};
                usage.set(parentDisk, {
                    sizeBytes: current.sizeBytes,
                    usedBytes: current.usedBytes + part.used
                });
            }

            await walk(child, parentDisk);
        }
    }

    for (const blockDevice of blockDevices) {
        await walk(blockDevice);
    }

    return usage;
}

async function readPhysicalDrives() {
    const blockDevices = await readBlockDevices();
    const disks = blockDevices.filter(isPhysicalDisk);
    if (!disks.length) {
        return [];
    }

    const usageMap = await readDriveUsageMap(blockDevices);
    const drives = [];

    for (const disk of disks) {
        const device = normalizeDiskDevice(disk);
        if (!device) continue;

        const smart = await runSmartctlJson(disk);
        const info = smart?.data || null;
        const usage = usageMap.get(device) || {sizeBytes: Number(disk.size || 0), usedBytes: 0};
        const sizeBytes = Number(usage.sizeBytes || disk.size || 0);
        const usedBytes = Number(usage.usedBytes || 0);
        const usedPercent = sizeBytes > 0
            ? clamp(Math.round((usedBytes / sizeBytes) * 100), 0, 100)
            : null;

        drives.push({
            device,
            byId: null,
            model: getDiskModel(disk),
            tempC: parseSmartTemperature(info),
            status: parseSmartStatus(info),
            sizeBytes,
            usedBytes,
            usedPercent
        });
    }

    return drives.sort((a, b) => a.device.localeCompare(b.device));
}

module.exports = {
    readPhysicalDrives,
    _internals: {
        isPhysicalDisk,
        inferSmartDeviceTypes,
        parseSmartStatus,
        parseSmartTemperature
    }
};
