// /assets/drawer-data.js
(async function () {
    const $ = (sel) => document.querySelector(sel);

    function setText(sel, val) { const n = $(sel); if (n) n.textContent = val; }
    function setBar(id, percent) {
        const p = Math.max(0, Math.min(100, Math.round(percent)));
        const bar = document.querySelector(`#${id} i`);
        if (bar) bar.style.width = p + "%";
        const label = document.querySelector(`[data-label-for='${id}']`);
        if (label) label.textContent = p + "%";
    }

    function humanBytes(b) {
        if (b == null) return "–";
        const units = ["B","KB","MB","GB","TB","PB"];
        let i = 0, n = b;
        while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
        return n.toFixed(n >= 10 ? 0 : 1) + " " + units[i];
    }

    async function load() {
        const r = await fetch("/api/stats", { cache: "no-store" });
        if (!r.ok) throw new Error("fetch failed");
        const s = await r.json();

        // RAM
        if (s.ram) {
            setBar("ram-usage", s.ram.percent);
        }

        // Disks (wir mappen die ersten drei auf sda/sdb/sdc – passe bei Bedarf IDs an)
        if (Array.isArray(s.disks)) {
            const map = ["disk-sda", "disk-sdb", "disk-sdc"];
            s.disks.slice(0, 3).forEach((d, i) => setBar(map[i], d.usedPercent));
        }

        // Temps
        if (s.temps) {
            setText("[data-cpu-temp]", s.temps.cpu || "–");
            const hddT = (s.temps.disks && s.temps.disks[0]?.tempC) ? `${s.temps.disks[0].tempC}°C` : "–";
            setText("[data-nvme-temp]", hddT);
        }

        // Uptime & Load
        if (s.uptime) {
            const u = s.uptime;
            setText("[data-uptime]", `${u.days} Tage ${u.hours} Std`);
        }
        if (Array.isArray(s.load)) {
            setText("[data-load]", s.load.map(v => v.toFixed(2)).join(" / "));
        }

        // OMV + Plugins
        if (s.versions) {
            setText("[data-omv-version]", s.versions.omv || "–");
            if (Array.isArray(s.versions.plugins)) {
                const txt = s.versions.plugins.slice(0, 4).map(p => `${p.name} ${p.version}`).join(" · ");
                setText("[data-plugins]", txt || "–");
            }
        }

        // Docker Updates
        if (s.docker) {
            const n = s.docker.total || 0;
            setText("[data-updates]", n === 0 ? "Keine Updates" : `${n} Container haben Updates`);
        }

        // Timestamp
        const date = new Date(s.ts || Date.now());
        const ts = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const tsEl = document.querySelector("#info-drawer footer .chip");
        if (tsEl) tsEl.textContent = ts;
    }

    async function loop() {
        try { await load(); } catch (e) { console.warn("stats load failed:", e); }
        setTimeout(loop, 30000);
    }

    // initial
    loop();
})();
