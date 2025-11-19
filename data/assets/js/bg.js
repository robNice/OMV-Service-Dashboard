(function () {
    try {
        const BASE = '/assets/backgrounds';
        const html = document.documentElement;

        const override =
            (document.querySelector('meta[name="omv-bg"]') || {}).content ||
            html.dataset.bg ||
            (document.body && document.body.dataset ? document.body.dataset.bg : null);

        if (override) {
            setBg(override);
            return;
        }

        const path = (location.pathname || '/')
            .replace(/\/+/g, '/')
            .replace(/\/$/, '') || '/';

        if (path === '/') {
            setBg(`${BASE}/_home.png`);
            return;
        }

        const m = path.match(/^\/section\/([^/]+)$/);
        if (m) {
            const slug = decodeURIComponent(m[1]);
            setBg(`${BASE}/${slug}.jpg`);
            return;
        }

        function setBg(url) {
            if (!url) return;
            html.style.setProperty('--bg-url', `url('${url}')`);
            html.style.setProperty('--bg-opacity', '1');
        }
    } catch (e) {
        console.warn('[omv-bg] failed:', e);
    }
})();
