(function () {
    const toggles = document.querySelectorAll('.admin-nav-toggle');

    toggles.forEach((toggle) => {
        const header = toggle.closest('.admin-header');
        const nav = header ? header.querySelector('.admin-nav') : null;
        if (!header || !nav) return;

        const setOpen = (isOpen) => {
            header.classList.toggle('admin-nav-open', isOpen);
            toggle.setAttribute('aria-expanded', String(isOpen));
        };

        toggle.addEventListener('click', () => {
            setOpen(!header.classList.contains('admin-nav-open'));
        });

        nav.addEventListener('click', (event) => {
            const link = event.target.closest('a');
            if (link) {
                setOpen(false);
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 860) {
                setOpen(false);
            }
        });
    });
})();
