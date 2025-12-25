(function () {
    try {
        const BASE = '/assets/backgrounds';
        const html = document.documentElement;
        const EXTS = ['jpg', 'gif', 'webp', 'png'];
        const CACHE_PREFIX = 'omv-bg:';

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
            setBgAutoCached(`${BASE}/_home`);
            return;
        }


        const m = path.match(/^\/section\/([^/]+)$/);
        if (m) {
            const slug = decodeURIComponent(m[1]);
            setBgAutoCached(`${BASE}/${slug}`);
            return;
        }

        function setBg(url) {
            if (!url) return;
            html.style.setProperty('--bg-url', `url('${url}')`);
            html.style.setProperty('--bg-opacity', '1');
        }

        async function head(url) {
            try {
                const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
                if (!r.ok) return null;
                return r.headers.get('etag');
            } catch {
                return null;
            }
        }

        async function setBgAutoCached(base) {
            const key = CACHE_PREFIX + base;
            const cached = sessionStorage.getItem(key);

            if (cached) {
                const { url, etag } = JSON.parse(cached);
                const curEtag = await head(url);
                if (curEtag && curEtag === etag) {
                    setBg(url);
                    return;
                }
            }

            for (const ext of EXTS) {
                const url = `${base}.${ext}`;
                const etag = await head(url);
                if (etag) {
                    sessionStorage.setItem(
                        key,
                        JSON.stringify({ url, etag })
                    );
                    setBg(url);
                    return;
                }
            }
        }
    } catch (e) {
        console.warn('[omv-bg] failed:', e);
    }
})();
