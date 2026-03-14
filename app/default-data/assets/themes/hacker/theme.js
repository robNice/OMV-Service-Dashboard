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
            let closeTabTimer = null;
            let wasOpen = drawer.classList.contains('open');
            const syncTabState = (isOpen) => {
                window.clearTimeout(closeTabTimer);

                if (isOpen) {
                    tab.classList.add('drawer-open');
                    return;
                }

                // Keep the tab docked until the panel has finished sliding up.
                closeTabTimer = window.setTimeout(() => {
                    tab.classList.remove('drawer-open');
                }, 240);
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
            syncTabState(drawer.classList.contains('open'));

            const observer = new MutationObserver(() => {
                const isOpen = drawer.classList.contains('open');
                syncTabState(isOpen);
                if (isOpen && !wasOpen) {
                    runBootFx();
                }
                wasOpen = isOpen;
            });

            observer.observe(drawer, { attributes: true, attributeFilter: ['class'] });
            drawer._omvThemeDestroy = () => {
                window.clearTimeout(bootTimer);
                window.clearTimeout(closeTabTimer);
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
