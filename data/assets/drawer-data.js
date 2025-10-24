// /assets/drawer-data.js
// Lädt /api/stats regelmäßig, zeigt RAM, Disks, Temps, Versionsinfos u. Updates.

(async function () {
    const $ = (sel) => document.querySelector(sel);
    const host = "/api/stats";
    const POLL_MS = 30000; // 30s

    function humanBytes(b) {
        if (!b || b <= 0) return "–";
        const u = ["B", "KB", "MB", "GB", "TB", "PB"];
        let i = 0, n = b;
        while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
        return n.toFixed(n >= 10 ? 0 : 1) + " " + u[i];
    }

    function setText(sel, val) {
        const el = $(sel);
        if (el) el.textContent = val;
    }

    // Farbverlauf für Balken nach Belegung
    function usageColor(p) {
        if (p >= 85) return "linear-gradient(to right,#ef4444,#b91c1c)"; // rot
        if (p >= 70) return "linear-gradient(to right,#f97316,#ea580c)"; // orange
        if (p >= 50) return "linear-gradient(to right,#eab308,#ca8a04)"; // gelb
        return "linear-gradient(to right,#22c55e,#15803d)"; // grün
    }

    // Hilfsfunktion: einen Disk-Balken rendern
    function renderDisk(d) {
        const total = humanBytes(d.size);
        const p = Math.min(100, Math.max(0, d.usedPercent || 0));
        return `
      <div class="kv" style="flex-direction:column;align-items:stretch">
        <div style="display:flex;justify-content:space-between;font-size:.9rem">
          <span>${d.src.replace("/dev/","")}</span>
          <span class="chip">${p}% · ${total}</span>
        </div>
        <div class="bar"><i style="width:${p}%;background:${usageColor(p)}"></i></div>
      </div>
    `;
    }

    // Hauptaktualisierung
    async function loadStats() {
        const res = await fetch(host, { cache: "no-store" });
        if (!res.ok) throw new Error(res.statusText);
        const s = await res.json();

        // RAM
        if (s.ram) {
            const p = s.ram.percent ?? 0;
            const used = (s.ram.used / (1024 ** 3)).toFixed(1);
            const total = (s.ram.total / (1024 ** 3)).toFixed(1);
            setText("[data-label-for='ram-usage']", p + "%");
            const bar = $("#ram-usage i");
            if (bar) {
                bar.style.width = p + "%";
                bar.style.background = usageColor(p);
            }
            setText("[data-ram-used]", `${used}/${total} GB`);
        }

        // Disks
        const cont = $("#drawer-disks");
        if (cont) {
            cont.innerHTML = "";
            if (Array.isArray(s.disks) && s.disks.length) {
                cont.innerHTML = s.disks.map(renderDisk).join("");
            } else {
                cont.innerHTML = `<div class="kv"><span>Keine Datenträger erkannt</span></div>`;
            }
        }

        // Temperaturen
        if (s.temps) {
            setText("[data-cpu-temp]", s.temps.cpu || "–");
            const hddTemp =
                s.temps.disks && s.temps.disks.length
                    ? Math.round(
                    s.temps.disks.map((x) => x.tempC).reduce((a, b) => a + b, 0) /
                    s.temps.disks.length
                ) + "°C"
                    : "–";
            setText("[data-nvme-temp]", hddTemp);
        }

        // Uptime & Load
        if (s.uptime)
            setText(
                "[data-uptime]",
                `${s.uptime.days} Tage ${s.uptime.hours} Std`
            );
        if (s.load)
            setText(
                "[data-load]",
                s.load.map((v) => v.toFixed(2)).join(" / ")
            );

        // Versionsinfos
        if (s.versions) {
            setText("[data-omv-version]", s.versions.omv || "–");
            const plugins =
                s.versions.plugins
                    ?.slice(0, 5)
                    .map((p) => `${p.name} ${p.version}`)
                    .join(" · ") || "–";
            setText("[data-plugins]", plugins);
        }

        // Docker-Updates
        if (s.docker)
            setText(
                "[data-updates]",
                s.docker.total > 0
                    ? `${s.docker.total} Container haben Updates`
                    : "Keine Updates"
            );

        // Zeitstempel
        const date = new Date(s.ts || Date.now());
        const t = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const chip = $("#info-drawer footer .chip");
        if (chip) chip.textContent = t;
    }

    async function loop() {
        try {
            await loadStats();
        } catch (e) {
            console.warn("stats fetch error", e);
        }
        setTimeout(loop, POLL_MS);
    }

    loop();
})();
