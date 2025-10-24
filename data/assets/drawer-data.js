// /assets/drawer-data.js
// Lädt /api/stats regelmäßig und rendert RAM, HDDs (physische Drives), Temps, Versionen, Updates.

(async function () {
    const $ = (sel) => document.querySelector(sel);
    const host = "/api/stats";
    const POLL_MS = 30000; // 30s

    function humanBytes(b) {
        const n = Number(b || 0);
        if (!n || n <= 0) return "–";
        const u = ["B", "KB", "MB", "GB", "TB", "PB"];
        let i = 0, x = n;
        while (x >= 1024 && i < u.length - 1) { x /= 1024; i++; }
        return x.toFixed(x >= 10 ? 0 : 1) + " " + u[i];
    }

    function setText(sel, val) {
        const el = $(sel); if (el) el.textContent = val;
    }

    // Farbverlauf für Balken nach Füllstand
    function usageColor(p) {
        if (p >= 85) return "linear-gradient(to right,#ef4444,#b91c1c)"; // rot
        if (p >= 70) return "linear-gradient(to right,#f97316,#ea580c)"; // orange
        if (p >= 50) return "linear-gradient(to right,#eab308,#ca8a04)"; // gelb
        return "linear-gradient(to right,#22c55e,#15803d)";              // grün
    }

    // Back-compat & Guards: unterstützt altes (src/size/usedPercent) und neues (device/model/tempC/sizeBytes/usedBytes/usedPercent) Format
    function normalizeDisk(d) {
        // device name
        const dev = (d.device || d.src || d.byId || "").toString();
        const device = dev.includes("/dev/") ? dev : (d.device ? d.device : (d.src ? d.src : ""));
        const name = device ? device.replace("/dev/", "") : (d.byId?.split("/").pop() || "unknown");

        // model / temp
        const model = d.model || d.modelName || (d.byId?.split("/").pop()) || "";
        const tempC = (typeof d.tempC === "number") ? d.tempC : null;

        // sizes
        const sizeBytes = (typeof d.sizeBytes === "number") ? d.sizeBytes
            : (typeof d.size === "number") ? d.size
                : 0;
        const usedBytes = (typeof d.usedBytes === "number") ? d.usedBytes : null;

        // percent
        let p = null;
        if (typeof d.usedPercent === "number") p = d.usedPercent;
        else if (usedBytes != null && sizeBytes > 0) p = Math.round(Math.min(100, Math.max(0, (usedBytes / sizeBytes) * 100)));

        return { device: device || "", name, model, tempC, sizeBytes, usedBytes, usedPercent: p };
    }

    function renderDisk(raw) {
        const d = normalizeDisk(raw);
        const total = humanBytes(d.sizeBytes);
        const used  = humanBytes(d.usedBytes);
        const p = Math.min(100, Math.max(0, d.usedPercent ?? 0));
        const modelStr = d.model ? `, ${d.model}` : "";
        const tempStr  = (typeof d.tempC === "number") ? ` · ${d.tempC}°C` : "";

        return `
      <div class="kv" style="flex-direction:column;align-items:stretch">
        <div style="display:flex;justify-content:space-between;font-size:.9rem">
          <span>${d.name}${modelStr}${tempStr}</span>
          <span class="chip">${d.usedPercent != null ? (p + "%") : "–"} · ${total}</span>
        </div>
        <div class="bar"><i style="width:${p}%;background:${usageColor(p)}"></i></div>
        <div style="display:flex;justify-content:flex-end;font-size:.75rem;opacity:.8">${used} / ${total}</div>
      </div>
    `;
    }

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

        // HDDs (physische Drives)
        const cont = $("#drawer-disks");
        if (cont) {
            cont.innerHTML = "";
            if (Array.isArray(s.disks) && s.disks.length) {
                cont.innerHTML = s.disks.map(renderDisk).join("");
            } else {
                cont.innerHTML = `<div class="kv"><span>Keine Laufwerke erkannt</span></div>`;
            }
        }

        // Temperaturen (nur CPU + optional Chassis)
        if (s.temps) {
            setText("[data-cpu-temp]", s.temps.cpu || "–");
            const ch = Array.isArray(s.temps.chassis) ? s.temps.chassis.map(x => `${x.label}:${x.tempC}°C`).join(" · ") : "";
            const el = $("[data-chassis-temps]");
            if (el) el.textContent = ch || "";
        }

        // Uptime & Load
        if (s.uptime)
            setText("[data-uptime]", `${s.uptime.days} Tage ${s.uptime.hours} Std`);
        if (s.load)
            setText("[data-load]", s.load.map((v) => Number(v).toFixed(2)).join(" / "));

        // Versionen
        if (s.versions) {
            setText("[data-omv-version]", s.versions.omv || "–");
            const plugins = s.versions.plugins?.slice(0, 5).map(p => `${p.name} ${p.version}`).join(" · ") || "–";
            setText("[data-plugins]", plugins);
        }

        // Docker Updates
        if (s.docker)
            setText("[data-updates]", s.docker.total > 0 ? `${s.docker.total} Container haben Updates` : "Keine Updates");

        // Zeitstempel
        const date = new Date(s.ts || Date.now());
        const t = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const chip = $("#info-drawer footer .chip");
        if (chip) chip.textContent = t;
    }

    async function loop() {
        try { await loadStats(); } catch (e) { console.warn("stats fetch error", e); }
        setTimeout(loop, POLL_MS);
    }

    loop();
})();
