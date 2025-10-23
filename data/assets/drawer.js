/* Info Drawer: toggling, persistence, and placeholder updaters */
(function () {
    const STORAGE_KEY = "omv.infoDrawer.open";

    // Create minimal event bus so we can trigger data refreshes later
    const bus = new EventTarget();
    window.OMVDrawerBus = bus; // optional: for future hooks

    const el = document.getElementById("info-drawer");
    const tab = el?.querySelector(".tab");
    const closeBtn = el?.querySelector("[data-close]");
    if (!el || !tab) return;

    const setOpen = (open) => {
        el.classList.toggle("open", open);
        try { localStorage.setItem(STORAGE_KEY, open ? "1" : "0"); } catch (_) {}
    };

    tab.addEventListener("click", () => setOpen(!el.classList.contains("open")));
    closeBtn?.addEventListener("click", () => setOpen(false));

    // Restore last state
    try { setOpen(localStorage.getItem(STORAGE_KEY) === "1"); } catch (_) {}

    /* ------- Placeholder data wiring (replace later) ------- */

    function setBar(id, percent) {
        const n = Math.max(0, Math.min(100, Number(percent) || 0));
        const el = document.querySelector(`#${id} i`);
        if (el) el.style.width = n + "%";
        const label = document.querySelector(`[data-label-for='${id}']`);
        if (label) label.textContent = n + "%";
    }

    // Example placeholders (remove when real endpoints added)
    setBar("ram-usage", 63);
    setBar("disk-sda", 72);
    setBar("disk-sdb", 43);
    setBar("disk-sdc", 87);

    const setText = (sel, text) => {
        const x = document.querySelector(sel);
        if (x) x.textContent = text;
    };

    setText("[data-cpu-temp]", "42°C");
    setText("[data-nvme-temp]", "38°C");
    setText("[data-uptime]", "7 Tage 12 Std");
    setText("[data-load]", "0.35 / 0.40 / 0.55");
    setText("[data-omv-version]", "7.0.x");
    setText("[data-plugins]", "OMV-Extras 7.6.2 · Borg 7.2.1 · rsnapshot 7.1.0");
    setText("[data-updates]", "2 Container haben Updates");
})();
