// data/assets/bg.js
// Minimaler Hintergrund-Switcher ohne Fallbacks/Probing.
// Erwartet vorhandene Dateien an festen Pfaden (kein Blitzen).

(function () {
    try {
        const BASE = '/assets/backgrounds';
        const html = document.documentElement;

        // Optionaler, expliziter Override (falls gesetzt)
        const override =
            (document.querySelector('meta[name="omv-bg"]') || {}).content ||
            html.dataset.bg ||
            (document.body && document.body.dataset ? document.body.dataset.bg : null);

        if (override) {
            setBg(override);
            return;
        }

        // Route ermitteln
        const path = (location.pathname || '/')
            .replace(/\/+/g, '/')
            .replace(/\/$/, '') || '/';

        // Home
        if (path === '/') {
            setBg(`${BASE}/_home.jpg`);
            return;
        }

        // Section: strikt nach Konvention ":slug.jpg"
        const m = path.match(/^\/section\/([^/]+)$/);
        if (m) {
            const slug = decodeURIComponent(m[1]);
            setBg(`${BASE}/${slug}.jpg`);
            return;
        }

        // Andere Routen: absichtlich nichts setzen (kein Default)
        // -> Stelle sicher, dass jede relevante Route ein passendes Bild hat.

        function setBg(url) {
            if (!url) return;
            html.style.setProperty('--bg-url', `url('${url}')`);
            html.style.setProperty('--bg-opacity', '1');
        }
    } catch (e) {
        // Falls irgendwas schiefgeht, bricht es still ab – kein Fallback, kein Flackern.
        console.warn('[omv-bg] failed:', e);
    }
})();
