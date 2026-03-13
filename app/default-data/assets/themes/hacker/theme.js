(function () {
    const BOOT_CLASS = 'hacker-booting';
    const TAB_HOST_ID = 'hacker-drawer-tab-host';

    window.OMVTheme = {
        init({ drawer }) {
            if (!drawer) {
                return;
            }

            const panel = drawer.querySelector('.panel');
            const tab = drawer.querySelector('.tab');
            if (!panel || !tab) {
                return;
            }

            let tabHost = document.getElementById(TAB_HOST_ID);
            if (!tabHost) {
                tabHost = document.createElement('div');
                tabHost.id = TAB_HOST_ID;
                document.body.appendChild(tabHost);
            }

            if (tab.parentElement !== tabHost) {
                tabHost.appendChild(tab);
            }

            let bootTimer = null;
            let wasOpen = drawer.classList.contains('open');
            const syncTabState = () => {
                tab.classList.toggle('drawer-open', drawer.classList.contains('open'));
            };
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
            syncTabState();

            const observer = new MutationObserver(() => {
                const isOpen = drawer.classList.contains('open');
                syncTabState();
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
                if (tabHost && tab.parentElement === tabHost && panel.firstElementChild) {
                    tab.classList.remove('drawer-open');
                    panel.insertBefore(tab, panel.firstElementChild);
                }
                if (tabHost && !tabHost.childNodes.length) {
                    tabHost.remove();
                }
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
