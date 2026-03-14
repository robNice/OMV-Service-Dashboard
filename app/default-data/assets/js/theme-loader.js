(function () {
    const body = document.body;
    const theme = body?.dataset?.theme;
    const version = window.OMV_VERSION || '';

    if (!body || !theme) {
        return;
    }

    const src = `/assets/themes/${encodeURIComponent(theme)}/theme.js${version ? `?v=${encodeURIComponent(version)}` : ''}`;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;

    script.addEventListener('load', () => {
        const api = window.OMVTheme;
        if (!api || typeof api.init !== 'function') {
            return;
        }

        api.init({
            theme,
            body,
            document,
            drawer: document.getElementById('info-drawer'),
            version
        });
    });

    script.addEventListener('error', () => {
        script.remove();
    });

    document.head.appendChild(script);
})();
