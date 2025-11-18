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

    function renderContainerList(containers) {
        const target = $('[data-containers-list-target]');
        if (!target) return;

        target.innerHTML = ''; // Liste leeren

        if (!containers || containers.length === 0) {
            target.innerHTML = `<li style="list-style:none;text-align:center;color:var(--muted);font-size:.85rem;padding:.5rem 0;">Keine Container aktiv</li>`;
            return;
        }

        containers.forEach(c => {
            // Status farblich hervorheben
            const statusLower = c.status.toLowerCase();
            const statusClass = statusLower.includes('up') ? 'status-good' :
                statusLower.includes('exited') ? 'status-warn' :
                    'status-unknown';

            const html = `
                <li>
                    <div class="kv">
                        <span title="${c.name}">${c.name}</span>
                        <span class="chip ${statusClass}" title="${c.status} (ID: ${c.id})">${c.status.split(' ')[0]}</span>
                    </div>
                </li>
            `;
            target.insertAdjacentHTML('beforeend', html);
        });
    }

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
        const tempStr = (d.tempC != null) ? `${d.tempC}°C` : "n/a";
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

    async function loadBasicStats() {
        const s = await fetch("/api/stats").then(r => r.json());

        // --- RAM ---
        setText("#ram .used", humanBytes(s.ram.used));
        setText("#ram .total", humanBytes(s.ram.total));

        // --- Drives ---
        const zone = $("#drives");
        if (zone && Array.isArray(s.drives)) {
            zone.innerHTML = s.drives.map(d => `
            <div class="drive">
                <strong>${d.device}</strong>
                <span>${d.model || ""}</span>
                <span>${d.temp || "-"}°C</span>
                <span>${d.smart || ""}</span>
            </div>
        `).join("");
        }

        // --- CPU + Chassis Temps ---
        if (s.temps) {
            setText("#temps .cpu", s.temps.cpu.join(" / ") + " °C");
            setText("#temps .chassis", s.temps.chassis.map(c => `${c.tempC}°C`).join(" / "));
        }

        // --- Versions ---
        if (s.versions) {
            setText("#versions .os", s.versions.os || "–");
            setText("#versions .kernel", s.versions.kernel || "–");
            setText("#versions .omv", s.versions.omv || "–");
        }

        // --- Zeitstempel ---
        const date = new Date();
        const t = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const chip = document.querySelector("#info-drawer footer .chip");
        if (chip) chip.textContent = t;
    }

    async function loadDockerStats() {
        const d = await fetch("/api/stats/docker").then(r => r.json());

        // Containerliste rendern
        const czone = $("#docker-container-list");
        if (czone && Array.isArray(d.containers)) {
            czone.innerHTML = d.containers.map(c => `
            <div class="container">
                <strong>${c.name}</strong>
                <span>${c.status}</span>
            </div>
        `).join("");
        }

        // Updates rendern
        const uzone = $("#docker-updates");
        if (uzone && d.dockerUpdates) {
            uzone.innerHTML = d.dockerUpdates.updates.map(u => `
            <div class="update">
                <strong>${u.container}</strong>
                <span>Update verfügbar</span>
            </div>
        `).join("");

            setText("#docker-update-count", d.dockerUpdates.total);
        }

        // Loading-Hinweis ausblenden
        const loading = $("#docker-loading");
        if (loading) loading.style.display = "none";
    }


    async function loadStats() {
        // ====== 1) Basisinfos schnell laden ======
        const basic = await fetch("/api/stats", { cache: "no-store" }).then(r => r.json());

        // RAM
        if (basic.ram) {
            const p = basic.ram.percent ?? 0;
            const used = (basic.ram.used / (1024 ** 3)).toFixed(1);
            const total = (basic.ram.total / (1024 ** 3)).toFixed(1);
            setText("[data-label-for='ram-usage']", p + "%");
            const bar = document.querySelector("#ram-usage i");
            if (bar) bar.style.width = p + "%";
            setText("[data-ram-used]", used + " GB");
            setText("[data-ram-total]", total + " GB");
        }

        // Laufwerke
        const cont = document.querySelector("[data-disks]");
        if (cont) {
            cont.innerHTML = "";
            if (Array.isArray(basic.disks) && basic.disks.length) {
                cont.innerHTML = basic.disks.map(renderDisk).join("");
            } else {
                cont.innerHTML = `<div class="kv"><span>Keine Laufwerke erkannt</span></div>`;
            }
        }

        // Disk Durchschnittstemperatur
        const avgDiskTemp = (() => {
            const arr = (basic.disks || [])
                .map(d => d && typeof d.tempC === "number" ? d.tempC : null)
                .filter(x => x != null);
            return arr.length ? Math.round(arr.reduce((a,b)=>a+b,0) / arr.length) : null;
        })();
        setText("[data-hdd-temp]", avgDiskTemp !== null ? `${avgDiskTemp}°C` : "–");

        // Temperaturen
        if (basic.temps) {
            setText("[data-cpu-temp]", basic.temps.cpu || "–");
            const ch = Array.isArray(basic.temps.chassis)
                ? basic.temps.chassis.map(x => `${x.label}:${x.tempC}°C`).join(" · ") : "";
            const el = document.querySelector("[data-chassis-temps]");
            if (el) el.textContent = ch || "–";
        }

        // Uptime & Load
        if (basic.uptime) setText("[data-uptime]", `${basic.uptime.days} Tage ${basic.uptime.hours} Std`);
        if (basic.load)   setText("[data-load]", basic.load.map(v => Number(v).toFixed(2)).join(" / "));

        // Versionen
        if (basic.versions) {
            setText("[data-version-os]", basic.versions.os || "–");
            setText("[data-version-kernel]", basic.versions.kernel || "–");
            setText("[data-version-omv]", basic.versions.omv || "–");
        }

        // Zeitstempel für Basisdaten
        const now = new Date();
        const ts = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const chip = document.querySelector("#info-drawer footer .chip");
        if (chip) chip.textContent = ts;

        // ====== 2) Docker-Infos asynchron nachladen ======
        fetch("/api/stats/docker", { cache: "no-store" })
            .then(r => r.json())
            .then(docker => {
                // Docker Container
                if (docker.containers) {
                    renderContainerList(docker.containers);
                }

                // Updates
                const uzone = document.querySelector("[data-docker-updates]");
                if (uzone && docker.dockerUpdates) {
                    uzone.innerHTML = docker.dockerUpdates.updates.map(u => `
                    <div class="kv">
                        <span>${u.container}</span>
                        <span class="chip status-warn">Update</span>
                    </div>
                `).join("");
                }
            })
            .catch(err => console.warn("Docker async load failed:", err));
    }

    // async function loop() {
    //     try { await loadStats(); } catch (e) { console.warn("stats fetch error", e); }
    //     setTimeout(loop, POLL_MS);
    // }

    async function loop() {
        try {
            await loadBasicStats();   // sofort
            loadDockerStats();        // async, blockiert nichts
        } catch (e) {
            console.warn("stats fetch error", e);
        }
        setTimeout(loop, POLL_MS);
    }


    loop();
})();
