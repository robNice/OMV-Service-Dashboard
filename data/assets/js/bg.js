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
            setBgAuto(`${BASE}/${slug}`);
            return;
        }

        function setBg(url) {
            if (!url) return;
            html.style.setProperty('--bg-url', `url('${url}')`);
            html.style.setProperty('--bg-opacity', '1');
        }

        function setBgAuto(base) {
            const exts = ['png', 'jpg', 'gif'];
            let i = 0;

            (function tryNext() {
                if (i >= exts.length) return;
                const url = `${base}.${exts[i++]}`;
                const img = new Image();
                img.onload = () => setBg(url);
                img.onerror = tryNext;
                img.src = url;
            })();
        }
    } catch (e) {
        console.warn('[omv-bg] failed:', e);
    }
})();
