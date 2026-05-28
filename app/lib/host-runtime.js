const fs = require("fs/promises");
const fsSync = require("fs");

const IS_CONTAINER = fsSync.existsSync("/.dockerenv");

const PROC = process.env.PROC_ROOT || (IS_CONTAINER ? "/host/proc" : "/proc");
const SYS = process.env.SYS_ROOT || (IS_CONTAINER ? "/host/sys" : "/sys");
const HOST = process.env.HOST_ROOT || (IS_CONTAINER ? "/hostroot" : "/");
const DPKG = process.env.DPKG_ROOT || (IS_CONTAINER ? "/host/var/lib/dpkg" : "/var/lib/dpkg");

const EXE_OPTS = {
    timeout: 15000,
    env: {LC_ALL: "C", LANG: "C"},
    maxBuffer: 50 * 1024 * 1024
};

function hostCmd(cmd) {
    return IS_CONTAINER
        ? `chroot ${HOST} ${cmd}`
        : cmd;
}

async function readFileSafe(file) {
    try {
        return await fs.readFile(file, "utf8");
    } catch {
        return null;
    }
}

async function readdirSafe(dir) {
    try {
        return await fs.readdir(dir);
    } catch {
        return [];
    }
}

async function statfsSafe(target) {
    try {
        return await fs.statfs(target);
    } catch {
        return null;
    }
}

module.exports = {
    PROC,
    SYS,
    HOST,
    DPKG,
    EXE_OPTS,
    IS_CONTAINER,
    hostCmd,
    readFileSafe,
    readdirSafe,
    statfsSafe
};
