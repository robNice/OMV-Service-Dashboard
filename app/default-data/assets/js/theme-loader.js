(function () {
    const body = document.body;
    const theme = body?.dataset?.theme;
    const settingsEl = document.getElementById('omv-theme-settings');
    const settings = settingsEl?.textContent ? JSON.parse(settingsEl.textContent) : {};
    const version = window.OMV_VERSION || '';
    const MOBILE_BREAKPOINT = 640;
    const TABLET_BREAKPOINT = 960;

    if (!body || !theme) {
        return;
    }

    function buildGridTemplate(value) {
        const columns = Number(value);

        if (!Number.isFinite(columns) || columns <= 0) {
            return 'repeat(auto-fit, minmax(min(100%, var(--omv-service-card-width, 300px)), 1fr))';
        }

        return `repeat(${Math.max(1, Math.floor(columns))}, minmax(0, 1fr))`;
    }

    function getGridTemplateForViewport() {
        if (window.innerWidth <= MOBILE_BREAKPOINT) {
            return buildGridTemplate(settings['cards-per-row-mobile']);
        }

        if (window.innerWidth <= TABLET_BREAKPOINT) {
            return buildGridTemplate(settings['cards-per-row-tablet']);
        }

        return buildGridTemplate(settings['cards-per-row-desktop']);
    }

    function applyResponsiveCardGrid() {
        const grid = document.querySelector('.grid');
        if (!grid) {
            return;
        }

        body.style.setProperty('--omv-grid-template-desktop', buildGridTemplate(settings['cards-per-row-desktop']));
        body.style.setProperty('--omv-grid-template-tablet', buildGridTemplate(settings['cards-per-row-tablet']));
        body.style.setProperty('--omv-grid-template-mobile', buildGridTemplate(settings['cards-per-row-mobile']));
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = getGridTemplateForViewport();
    }

    body._omvThemeGridCleanup?.();
    applyResponsiveCardGrid();

    const onResize = () => {
        applyResponsiveCardGrid();
    };

    window.addEventListener('resize', onResize);
    body._omvThemeGridCleanup = () => {
        window.removeEventListener('resize', onResize);
    };

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
            settings,
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
