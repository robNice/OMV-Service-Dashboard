(function () {
    const ROOT_ID = "sunrise-theme-note";

    function removeNote() {
        document.getElementById(ROOT_ID)?.remove();
    }

    window.OMVTheme = {
        // Demo for theme-specific JavaScript:
        // init() may add DOM or attributes for the active theme,
        // destroy() should remove those changes again.
        init({ body, drawer, theme }) {
            if (!body) {
                return;
            }

            const note = document.createElement("div");
            note.id = ROOT_ID;
            note.textContent = `Theme: ${theme}`;
            note.setAttribute("aria-hidden", "true");
            body.appendChild(note);

            if (drawer) {
                drawer.setAttribute("data-sunrise-theme", "active");
            }
        },
        destroy() {
            document.querySelector('[data-sunrise-theme="active"]')?.removeAttribute("data-sunrise-theme");
            removeNote();
        }
    };
})();
