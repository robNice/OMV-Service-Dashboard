(function () {
    const BOOT_CLASS = 'hacker-booting';

    window.OMVTheme = {
        init({ drawer }) {
            if (!drawer) {
                return;
            }

            let bootTimer = null;
            let wasOpen = drawer.classList.contains('open');
            const runBootFx = () => {
                drawer.classList.remove(BOOT_CLASS);
                void drawer.offsetWidth;
                drawer.classList.add(BOOT_CLASS);
                window.clearTimeout(bootTimer);
                bootTimer = window.setTimeout(() => {
                    drawer.classList.remove(BOOT_CLASS);
                }, 1200);
            };

            if (drawer.classList.contains('open')) {
                runBootFx();
            }

            const observer = new MutationObserver(() => {
                const isOpen = drawer.classList.contains('open');
                if (isOpen && !wasOpen) {
                    runBootFx();
                }
                wasOpen = isOpen;
            });

            observer.observe(drawer, { attributes: true, attributeFilter: ['class'] });
            drawer._omvThemeDestroy = () => {
                window.clearTimeout(bootTimer);
                observer.disconnect();
                drawer.classList.remove(BOOT_CLASS);
            };
        },
        destroy() {
            const drawer = document.getElementById('info-drawer');
            if (!drawer) {
                return;
            }

            drawer._omvThemeDestroy?.();
            delete drawer._omvThemeDestroy;
        }
    };
})();
