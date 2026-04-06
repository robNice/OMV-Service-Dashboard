const {exec} = require("child_process");
const {promisify} = require("util");

const sh = promisify(exec);

const {EXE_OPTS, hostCmd} = require("./host-runtime");
const {readOMV} = require("./platform-info");

function parseIniValue(text, key) {
    const match = String(text || "").match(new RegExp(`^${key}\\s*=\\s*(.+)$`, "mi"));
    return match ? match[1].trim().replace(/^"|"$/g, "") : "";
}

async function readCommandText(command) {
    try {
        const {stdout} = await sh(command, EXE_OPTS);
        return String(stdout || "").trim();
    } catch {
        return "";
    }
}

async function readNasPlatform() {
    const omv = await readOMV();
    if (omv.omv) {
        return {id: "omv", name: "OpenMediaVault", version: omv.omv};
    }

    const synologyVersionRaw = await readCommandText(
        hostCmd(`/bin/bash -lc "if [ -f /etc.defaults/VERSION ]; then cat /etc.defaults/VERSION; elif [ -f /etc/VERSION ]; then cat /etc/VERSION; fi"`)
    );
    if (synologyVersionRaw) {
        const major = parseIniValue(synologyVersionRaw, "majorversion");
        const minor = parseIniValue(synologyVersionRaw, "minorversion");
        const micro = parseIniValue(synologyVersionRaw, "micro");
        const build = parseIniValue(synologyVersionRaw, "buildnumber");
        const baseVersion = [major, minor, micro].filter(Boolean).join(".");
        const version = [baseVersion, build ? `build ${build}` : ""].filter(Boolean).join(" ");
        return {id: "synology", name: "Synology DSM", version};
    }

    const qnapVersionRaw = await readCommandText(
        hostCmd(`/bin/bash -lc "if [ -f /etc/config/uLinux.conf ]; then cat /etc/config/uLinux.conf; elif [ -f /etc/default_config/uLinux.conf ]; then cat /etc/default_config/uLinux.conf; fi"`)
    );
    if (qnapVersionRaw) {
        const version =
            parseIniValue(qnapVersionRaw, "Version") ||
            parseIniValue(qnapVersionRaw, "Display Version") ||
            parseIniValue(qnapVersionRaw, "Firmware Version");
        const build = parseIniValue(qnapVersionRaw, "Build Number");
        return {
            id: "qnap",
            name: "QNAP QTS",
            version: [version, build ? `build ${build}` : ""].filter(Boolean).join(" ")
        };
    }

    const unraidVersion = await readCommandText(
        hostCmd(`/bin/bash -lc "if [ -f /etc/unraid-version ]; then cat /etc/unraid-version; fi"`)
    );
    if (unraidVersion) {
        return {id: "unraid", name: "Unraid", version: unraidVersion};
    }

    const truenasVersion = await readCommandText(
        hostCmd(`/bin/bash -lc "if [ -f /etc/version ]; then cat /etc/version; elif [ -f /etc/truenas/version ]; then cat /etc/truenas/version; fi"`)
    );
    if (truenasVersion && /truenas|freenas/i.test(truenasVersion)) {
        const name = /freenas/i.test(truenasVersion) ? "FreeNAS" : "TrueNAS";
        return {id: name.toLowerCase(), name, version: truenasVersion};
    }

    return null;
}

module.exports = {
    readNasPlatform
};
