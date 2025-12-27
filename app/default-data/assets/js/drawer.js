(function () {
    const STORAGE_KEY = "omv.infoDrawer.open";
    const el = document.getElementById("info-drawer");
    const tab = el?.querySelector(".tab");
    const closeBtn = el?.querySelector("[data-close]");
    if (!el || !tab) return;
    const setOpen = (open) => {
        el.classList.toggle("open", open);
        window.setTimeout(() => tab.blur(), 750);
        try {
            localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
        } catch (_) {
        }
    };

    tab.addEventListener("click", () => setOpen(!el.classList.contains("open")));
    closeBtn?.addEventListener("click", () => setOpen(false));

    try {
        setOpen(localStorage.getItem(STORAGE_KEY) === "1");
    } catch (_) {
    }
})();
