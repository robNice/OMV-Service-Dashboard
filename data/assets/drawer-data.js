// Rendert RAM, physische HDDs (Model + Temp + Status), CPU-/Chassis-Temps, Versionen, Updates
(async function () {
    const $ = (sel) => document.querySelector(sel);
    const host = "/api/stats";
    const POLL_MS = 30000;

    function humanBytes(b) {
        const n = Number(b || 0);
        if (!n || n <= 0) return "–";
        const u = ["B", "KB", "MB", "GB", "TB", "PB"];
        let i = 0, x = n;
        while (x >= 1024 && i < u.length - 1) { x /= 1024; i++; }
        return x.toFixed(x >= 10 ? 0 : 1) + " " + u[i];
    }
    function setText(sel, val) { const el = $(sel); if (el) el.textContent = val; }

    function usageColor(p) {
        if (p >= 85) return "linear-gradient(to right,#ef4444,#b91c1c)";
        if (p >= 70) return "linear-gradient(to right,#f97316,#ea580c)";
        if (p >= 50) return "linear-gradient(to right,#eab308,#ca8a04)";
        return "linear-gradient(to right,#22c55e,#15803d)";
    }
    function statusStyle(s) {
        const v = String(s || "UNKNOWN").toUpperCase();
        if (v.includes("GOOD") || v === "PASSED") {
            return "background:rgba(34,197,94,.2);border:1px solid rgba(34,197,94,.35);color:#86efac;";
        }
        if (v.includes("WARN") || v.includes("PRE-FAIL") || v.includes("DEGRADED")) {
            return "background:rgba(234,179,8,.18);border:1px solid rgba(234,179,8,.38);color:#fde68a;";
        }
        if (v.includes("FAIL") || v.includes("BAD") || v.includes("CRIT")) {
            return "background:rgba(239,68,68,.2);border:1px solid rgba(239,68,68,.35);color:#fecaca;";
        }
        return "background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#e5e7eb;";
    }

    function shortModel(str) {
        if (!str) return "";
        const t = String(str).trim();
        if (t.length <= 16) return t;
        return t.slice(0, 16) + "…";
    }

    function normalizeDisk(d) {
        const device = d.device || "";
        const name   = device ? device.replace("/dev/","") : (d.byId?.split("/").pop() || "unknown");
        const model  = (d.model && String(d.model).trim()) ? String(d.model).trim() : "";
        const tempC  = (typeof d.tempC === "number") ? d.tempC : null;
        const status = d.status || "UNKNOWN";
        const sizeBytes = Number(d.sizeBytes || 0);
        const usedBytes = Number(d.usedBytes || 0);
        const usedPercent = (typeof d.usedPercent === "number")
            ? Math.max(0, Math.min(100, Math.round(d.usedPercent)))
            : (sizeBytes > 0 ? Math.round(Math.min(100, Math.max(0, (usedBytes/sizeBytes)*100))) : 0);
        return { name, model, tempC, status, sizeBytes, usedBytes, usedPercent };
    }

    function renderDisk(raw) {
        const d = normalizeDisk(raw);
        const total = humanBytes(d.sizeBytes);
        const used  = humanBytes(d.usedBytes);
        const p = d.usedPercent;
        const tempStr = (d.tempC != null) ? `${d.tempC}°C` : "";
        const modelStr = d.model ? `, ${shortModel(d.model)}` : "";

        return `
      <div class="kv" style="flex-direction:column;align-items:stretch">
        <div style="display:flex;justify-content:space-between;gap:.5rem;font-size:.9rem;flex-wrap:wrap">
            <div style="flex-grow: 1;display: flex;justify-content: space-between;">
              <span>${d.name}${modelStr}</span>
              <span style="background: var(--chip-bg);font-size: .8rem;padding: .25rem .5rem;border-radius: 0.6rem;">${tempStr}</span>
            </div>
          <span class="chip" style="${statusStyle(d.status)}">${d.status}</span>
        </div>
        <div class="bar"><i style="width:${p}%;background:${usageColor(p)}"></i></div>
        <div style="display:flex;justify-content:flex-end;font-size:.75rem;opacity:.8">${used} / ${total} (${p}%)</div>
      </div>
      <div class="diskpart"></div>
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
            const bar = document.querySelector("#ram-usage i");
            if (bar) { bar.style.width = p + "%"; bar.style.background = usageColor(p); }
            setText("[data-ram-used]", `${used}/${total} GB`);
        }

        // HDDs (physische Drives)
        const cont = document.getElementById("drawer-disks");
        if (cont) {
            cont.innerHTML = "";
            if (Array.isArray(s.disks) && s.disks.length) {
                cont.innerHTML = s.disks.map(renderDisk).join("");
            } else {
                cont.innerHTML = `<div class="kv"><span>Keine Laufwerke erkannt</span></div>`;
            }
        }

        // HDD Ø-Temperatur (aus disks[].tempC)
        const avgDiskTemp = (() => {
            const arr = (s.disks || []).map(d => d && typeof d.tempC === "number" ? d.tempC : null).filter(x => x != null);
            return arr.length ? Math.round(arr.reduce((a,b)=>a+b,0) / arr.length) : null;
        })();
        setText("[data-hdd-temp]", avgDiskTemp !== null ? `${avgDiskTemp}°C` : "–");

        // Temperaturen (nur CPU + optional Chassis)
        if (s.temps) {
            setText("[data-cpu-temp]", s.temps.cpu || "–");
            const ch = Array.isArray(s.temps.chassis) ? s.temps.chassis.map(x => `${x.label}:${x.tempC}°C`).join(" · ") : "";
            const el = document.querySelector("[data-chassis-temps]");
            if (el) el.textContent = ch || "–";
        }

        // Uptime & Load
        if (s.uptime) setText("[data-uptime]", `${s.uptime.days} Tage ${s.uptime.hours} Std`);
        if (s.load)   setText("[data-load]", s.load.map(v => Number(v).toFixed(2)).join(" / "));

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
        const chip = document.querySelector("#info-drawer footer .chip");
        if (chip) chip.textContent = t;
    }

    async function loop() {
        try { await loadStats(); } catch (e) { console.warn("stats fetch error", e); }
        setTimeout(loop, POLL_MS);
    }

    loop();
})();
