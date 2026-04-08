(function () {
    const body = document.body;
    const theme = body?.dataset?.theme;
    const settingsEl = document.getElementById('omv-theme-settings');
    const settings = settingsEl?.textContent ? JSON.parse(settingsEl.textContent) : {};
    const version = window.OMV_VERSION || '';
    const MOBILE_QUERY = '(max-width: 640px)';
    const TABLET_QUERY = '(max-width: 960px)';

    if (!body || !theme) {
        return;
    }

    const hasResponsiveCardSettings =
        Object.prototype.hasOwnProperty.call(settings, 'cards-per-row-desktop')
        || Object.prototype.hasOwnProperty.call(settings, 'cards-per-row-tablet')
        || Object.prototype.hasOwnProperty.call(settings, 'cards-per-row-mobile');

    function buildGridTemplate(value) {
        const columns = Number(value);

        if (!Number.isFinite(columns) || columns <= 0) {
            return 'repeat(auto-fit, minmax(min(100%, var(--omv-service-card-width, 300px)), 1fr))';
        }

        return `repeat(${Math.max(1, Math.floor(columns))}, minmax(0, 1fr))`;
    }

    function getGridTemplateForViewport() {
        if (window.matchMedia(MOBILE_QUERY).matches) {
            return buildGridTemplate(settings['cards-per-row-mobile']);
        }

        if (window.matchMedia(TABLET_QUERY).matches) {
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

    if (hasResponsiveCardSettings) {
        applyResponsiveCardGrid();

        const onResize = () => {
            applyResponsiveCardGrid();
        };

        window.addEventListener('resize', onResize);
        body._omvThemeGridCleanup = () => {
            window.removeEventListener('resize', onResize);
        };
    } else {
        delete body._omvThemeGridCleanup;
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
