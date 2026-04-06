const {readPhysicalDrives} = require("../lib/storage-info");
const {readSystemInfo} = require("../lib/system-info");
const {readMem, readLoadUptime, readTempsCpuChassis} = require("../lib/resource-info");
const {readOMV, readDockerContainers, readPollInterval} = require("../lib/platform-info");
const {readNasPlatform} = require("../lib/nas-platform");
/**
 * creates output of the stats request
 * @returns {Promise<{ts: number, ram: Awaited<{load: number[], uptime: {days: number, hours: number, mins: number}}>, load: number[], uptime: {days: number, hours: number, mins: number}, temps: Awaited<{load: number[], uptime: {days: number, hours: number, mins: number}}>, container: Awaited<{load: number[], uptime: {days: number, hours: number, mins: number}}>, containers: Awaited<{load: number[], uptime: {days: number, hours: number, mins: number}}>, disks: Awaited<{load: number[], uptime: {days: number, hours: number, mins: number}}>, system: Awaited<{load: number[], uptime: {days: number, hours: number, mins: number}}>}>}
 */
async function getStats() {
    const [
            {
            load,
            uptime
        },
            ram,
            tempsCpuChassis,
            container,
            containers,
            drives,
            system,
            nasPlatform,
            pollInterval
            ] = await Promise.all([
        readLoadUptime(),
        readMem(),
        readTempsCpuChassis(),
        readOMV(),
        readDockerContainers(),
        readPhysicalDrives(),
        readSystemInfo(),
        readNasPlatform(),
        readPollInterval()
    ]);

    return {
        ts: Date.now(),
        ram,
        load,
        uptime,
        temps: tempsCpuChassis,
        container,
        containers,
        disks: drives,
        system: {
            ...system,
            nas: nasPlatform
        },
        pollInterval
    };
}

module.exports = {getStats};
