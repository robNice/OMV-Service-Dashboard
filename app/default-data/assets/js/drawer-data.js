(async function () {
    const $ = (sel) => document.querySelector(sel);
    const host = "/api/stats";
    let POLL_MS = 30000;
    let hasLoadedOnce = false;
    const initialStats = window.OMV_HAS_INITIAL_STATS ? window.OMV_INITIAL_STATS : null;
    let lastStatsTs = null;

    /**
     * Format the age of the latest stats snapshot.
     * @param ts
     * @returns {string}
     */
    function formatStatsAge(ts) {
        const deltaSeconds = Math.max(0, Math.floor((Date.now() - Number(ts || Date.now())) / 1000));
        const secLabel = window.I18N_STATUS?.SECONDS_SHORT || "s";
        const minLabel = window.I18N_STATUS?.MINUTES_SHORT || "min";
        const hourLabel = window.I18N_STATUS?.HOURS_SHORT || "h";

        if (deltaSeconds < 60) {
            return `${deltaSeconds} ${secLabel}`;
        }

        if (deltaSeconds < 3600) {
            const minutes = Math.floor(deltaSeconds / 60);
            const seconds = deltaSeconds % 60;
            return `${minutes} ${minLabel} ${seconds} ${secLabel}`;
        }

        const hours = Math.floor(deltaSeconds / 3600);
        const minutes = Math.floor((deltaSeconds % 3600) / 60);
        const seconds = deltaSeconds % 60;
        return `${hours} ${hourLabel} ${minutes} ${minLabel} ${seconds} ${secLabel}`;
    }

    /**
     * Update the footer chip with the age of the current stats.
     */
    function updateStatsAgeDisplay() {
        const chip = document.querySelector("[data-stats-age]");
        if (!chip || !lastStatsTs) return;
        chip.textContent = formatStatsAge(lastStatsTs);
    }

    /**
     * Toggle the initial loading hint for the drawer.
     * @param visible
     * @param mode
     */
    function setDrawerLoadingVisible(visible, mode = "loading") {
        const el = document.getElementById("drawer-loading");
        if (!el) return;
        el.classList.toggle("hidden", !visible);

        const title = el.querySelector("[data-loading-title-text]");
        const body = el.querySelector("[data-loading-body-text]");
        const titleKey = mode === "refreshing" ? "refreshingTitle" : "loadingTitle";
        const bodyKey = mode === "refreshing" ? "refreshingBody" : "loadingBody";

        if (title) {
            title.textContent = el.dataset[titleKey] || "";
        }
        if (body) {
            body.textContent = el.dataset[bodyKey] || "";
        }

        const content = document.querySelector("[data-drawer-content]");
        if (content) {
            content.classList.toggle("loading", visible && mode !== "refreshing");
        }
    }

    /**
     * Human readable file size.
     * @param b
     * @returns {string}
     */
    function humanBytes(b) {
        const n = Number(b || 0);
        if (!n || n <= 0) return "–";
        const keys = ["B", "KB", "MB", "GB", "TB", "PB"];
        let i = 0, x = n;
        while (x >= 1024 && i < keys.length - 1) {
            x /= 1024;
            i++;
        }
        const unit = (window.I18N_UNITS && window.I18N_UNITS[keys[i]]) || keys[i];
        return (x >= 10 ? x.toFixed(0) : x.toFixed(1)) + " " + unit;
    }

    /**
     * Set the innerText of an element.
     * @param sel
     * @param val
     */
    function setText(sel, val) {
        const el = $(sel);
        if (el) el.textContent = val;
    }

    /**
     * Set the innerHTML of an element.
     * @param sel
     * @param val
     */
    function setHtml(sel, val) {
        const el = $(sel);
        if (el) el.innerHTML = val;
    }

    /**
     * Get a color gradient for a given usage percentage.
     * @param p
     * @returns {string}
     */
    function usageColor(p) {
        const themed = getComputedStyle(document.body).getPropertyValue("--themesetting-progress-bar-color").trim();
        if (themed) {
            return themed;
        }

        if (p >= 85) return "linear-gradient(to right,#ef4444,#b91c1c)";
        if (p >= 70) return "linear-gradient(to right,#f97316,#ea580c)";
        if (p >= 50) return "linear-gradient(to right,#eab308,#ca8a04)";
        return "linear-gradient(to right,#22c55e,#15803d)";
    }

    /**
     * Get a CSS style string for a given status value.
     * @param s
     * @returns {string}
     */
    function statusStyle(s) {
        const v = String(s || "UNKNOWN").toUpperCase();
        if (v.includes("GOOD") || v === "PASSED") {
            return "background:var(--status-good-bg,rgba(34,197,94,.2));border:1px solid var(--status-good-border,rgba(34,197,94,.35));color:var(--status-good-text,#86efac);";
        }
        if (v.includes("WARN") || v.includes("PRE-FAIL") || v.includes("DEGRADED")) {
            return "background:var(--status-warn-bg,rgba(234,179,8,.18));border:1px solid var(--status-warn-border,rgba(234,179,8,.38));color:var(--status-warn-text,#fde68a);";
        }
        if (v.includes("FAIL") || v.includes("BAD") || v.includes("CRIT")) {
            return "background:var(--status-bad-bg,rgba(239,68,68,.2));border:1px solid var(--status-bad-border,rgba(239,68,68,.35));color:var(--status-bad-text,#fecaca);";
        }
        return "background:var(--status-neutral-bg,rgba(255,255,255,.08));border:1px solid var(--status-neutral-border,rgba(255,255,255,.12));color:var(--status-neutral-text,#e5e7eb);";
    }

    /**
     * Shorten a model name to fit into a drawer item.
     * @param str
     * @returns {string}
     */
    function shortModel(str) {
        if (!str) return "";
        const t = String(str).trim();
        if (t.length <= 16) return t;
        return t.slice(0, 16) + "…";
    }

    /**
     * Normalize a disk object to a common format.
     * @param d
     * @returns {{name: string|any|string, model: string|string, tempC: *|number|number, status: string, sizeBytes: number, usedBytes: number, usedPercent: number|number}}
     */
    function normalizeDisk(d) {
        const device = d.device || "";
        const name = device ? device.replace("/dev/", "") : (d.byId?.split("/").pop() || "unknown");
        const model = (d.model && String(d.model).trim()) ? String(d.model).trim() : "";
        const tempC = (typeof d.tempC === "number") ? d.tempC : null;
        const status = d.status || "UNKNOWN";
        const sizeBytes = Number(d.sizeBytes || 0);
        const usedBytes = Number(d.usedBytes || 0);
        const usedPercent = (typeof d.usedPercent === "number")
            ? Math.max(0, Math.min(100, Math.round(d.usedPercent)))
            : (sizeBytes > 0 ? Math.round(Math.min(100, Math.max(0, (usedBytes / sizeBytes) * 100))) : 0);
        return {name, model, tempC, status, sizeBytes, usedBytes, usedPercent};
    }

    /**
     * Get a CSS style string for a given container status value.
     * @param status
     * @returns {string}
     */
    function containerStatusStyle(status) {
        const s = String(status || "").toLowerCase();
        if (s.startsWith("up")) {
            return "background:var(--status-up-bg,rgba(34,197,94,.18));border:1px solid var(--status-up-border,rgba(34,197,94,.35));color:var(--status-up-text,#bbf7d0);";
        }
        return "background:var(--status-down-bg,rgba(239,68,68,.2));border:1px solid var(--status-down-border,rgba(239,68,68,.35));color:var(--status-down-text,#fecaca);";
    }

    /**
     * Render a container item.
     * @param it
     * @returns {string}
     */
    function renderContainerItem(it) {
        const name = it.name || it.Names || "";
        const status = it.status || it.Status || "";
        return `<div class="kv"><span>${name}</span><span class="chip" style="${containerStatusStyle(status)}">${status || "–"}</span></div>`;
    }

    /**
     * Render a plugin item.
     * @param plugin
     * @returns {string}
     */
    function renderPluginItem(plugin) {
        const name = plugin?.name || "";
        const version = plugin?.version || "–";
        return `<div class="kv plugin-item"><span>${name}</span><span class="chip">${version}</span></div>`;
    }

    /**
     * Render a disk item.
     * @param raw
     * @returns {string}
     */
    function renderDisk(raw) {
        const d = normalizeDisk(raw);
        const total = humanBytes(d.sizeBytes);
        const used = humanBytes(d.usedBytes);
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

    /**
     * Remove all ram info nodes from the drawer. (For resetting the container, before writing new values.)
     */
    function removeRamInfos() {
        let nodes = document.querySelectorAll('#info-drawer .section.system .kv.raminfo:not(.template)');
        nodes.forEach(node => {
            if (node instanceof Element && node.parentNode) {
                node.parentNode.removeChild(node);
            }
        });
    }

    /**
     * Clone a ram info node template and return it.
     * @returns {Node}
     */
    function createRamInfoClone() {
        let clone = document.querySelector('#info-drawer .section.system .kv.raminfo.template').cloneNode(true);
        clone.classList.remove('template');
        return clone;
    }

    /**
     * Add a ram info node to the drawer.
     * @param node
     */
    function addRamInfo(node) {
        const last = document.querySelectorAll("#info-drawer .section.system .kv.raminfo");
        const el = last[last.length - 1] || null;
        if (el) {
            el.after(node);
        }
    }

    /**
     * Set the system info in the drawer.
     * @param system
     */
    function setSystem(system) {
        setText("[data-host]", system.host);
        setText("[data-os]", system.os);
        setText("[data-nas]", system.nas ? [system.nas.name, system.nas.version].filter(Boolean).join(" ") : "–");
        setText("[data-kernel]", system.kernel);
        setText("[data-cpu]", system.cpu);
        setText("[data-gpu]", system.gpu);

        removeRamInfos();

        if (system.ram && system.ram.length > 0) {
            for (let i in system.ram) {
                let ramInfo = system.ram[i];
                let node = createRamInfoClone();
                node.querySelector('.label').innerText = ramInfo.slot;
                node.querySelector('.chip').innerText = ramInfo.size + ' / ' + ramInfo.speed + ' / ' + ramInfo.manufacturer;
                addRamInfo(node);

            }
        }

    }

    /**
     * Apply a stats payload to the drawer UI.
     * @param s
     */
    function applyStats(s) {
        lastStatsTs = s.ts || Date.now();
        if( s.pollInterval && s.pollInterval > 0 ) {
            POLL_MS = s.pollInterval;
        }
        if (s.ram) {
            const p = s.ram.percent ?? 0;
            const used = (s.ram.used / (1024 ** 3)).toFixed(1);
            const total = (s.ram.total / (1024 ** 3)).toFixed(1);
            setText("[data-label-for='ram-usage']", p + "%");
            const bar = document.querySelector("#ram-usage i");
            if (bar) {
                bar.style.width = p + "%";
                bar.style.background = usageColor(p);
            }
            setText("[data-ram-used]", `${used}/${total} GB`);
        }

        const cont = document.getElementById("drawer-disks");
        if (cont) {
            cont.innerHTML = "";
            if (Array.isArray(s.disks) && s.disks.length) {
                cont.innerHTML = s.disks.map(renderDisk).join("");
            } else {
                cont.innerHTML = `<div class="kv"><span>` + window.I18N_ERRORS.NO_DISKS_FOUND + `</span></div>`;
            }
        }

        const avgDiskTemp = (() => {
            const arr = (s.disks || []).map(d => d && typeof d.tempC === "number" ? d.tempC : null).filter(x => x != null);
            return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
        })();
        setText("[data-hdd-temp]", avgDiskTemp !== null ? `${avgDiskTemp}°C` : "–");

        if (s.temps) {
            setText("[data-cpu-temp]", s.temps.cpu || "–");
            const ch = Array.isArray(s.temps.chassis) ? s.temps.chassis.map(x => `${x.label}:${x.tempC}°C`).join(" · ") : "";
            const el = document.querySelector("[data-chassis-temps]");
            if (el) el.textContent = ch || "–";
        }

        if (s.uptime) setText("[data-uptime]", `${s.uptime.days} ` + window.I18N_LABELS.DAYS + ` ${s.uptime.hours} ` + window.I18N_LABELS.HOURS_SHORT);
        if (s.load) setText("[data-load]", s.load.map(v => Number(v).toFixed(2)).join(" / "));

        if (s.system) setSystem(s.system);

        if (s.container) {
            setText("[data-omv-version]", s.container.omv || "–");
            const pluginsCont = document.getElementById("drawer-plugins");
            if (pluginsCont) {
                const plugins = Array.isArray(s.container.plugins) ? s.container.plugins : [];
                pluginsCont.innerHTML = plugins.length
                    ? plugins.map(renderPluginItem).join("\n")
                    : `<div class="kv plugin-item"><span>–</span></div>`;
            }
        }
        const contDocker = document.getElementById("drawer-docker");
        if (contDocker) {
            const items = Array.isArray(s.containers) ? s.containers : [];
            contDocker.innerHTML = items.map(renderContainerItem).join("\n");
        }

        updateStatsAgeDisplay();
    }

    /**
     * Fetch and update the stats from the server.
     * @returns {Promise<void>}
     */
    async function loadStats() {
        const res = await fetch(host, {cache: "no-store"});
        if (!res.ok) throw new Error(res.statusText);
        const s = await res.json();
        if (!hasLoadedOnce) {
            hasLoadedOnce = true;
            setDrawerLoadingVisible(false);
        }
        applyStats(s);
    }

    /**
     * Start the stats fetch loop.
     * @returns {Promise<void>}
     */
    async function loop() {
        try {
            await loadStats();
        } catch (e) {
            console.warn("stats fetch error", e);
        }
        setTimeout(loop, POLL_MS);
    }

    if (initialStats) {
        applyStats(initialStats);
        hasLoadedOnce = true;
        setDrawerLoadingVisible(false);
    } else {
        setDrawerLoadingVisible(true, "loading");
    }

    loop();
    setInterval(updateStatsAgeDisplay, 1000);
})();
