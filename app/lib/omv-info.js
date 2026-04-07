const {DPKG, readFileSafe} = require("./host-runtime");

async function readOMV() {
    const status = await readFileSafe(`${DPKG}/status`);
    if (!status) {
        return {omv: null, plugins: []};
    }

    const blocks = status.split("\n\n");
    let omv = null;
    const plugins = [];

    for (const block of blocks) {
        const pkg = block.match(/^Package:\s*(.+)$/m)?.[1]?.trim();
        if (!pkg) continue;

        const ver = block.match(/^Version:\s*(.+)$/m)?.[1]?.trim();
        if (!ver) continue;

        if (pkg === "openmediavault") {
            omv = ver;
        } else if (pkg.startsWith("openmediavault-")) {
            plugins.push({
                name: pkg.replace(/^openmediavault-/, ""),
                version: ver
            });
        }
    }

    plugins.sort((a, b) => a.name.localeCompare(b.name));
    return {omv, plugins};
}

module.exports = {
    readOMV
};
