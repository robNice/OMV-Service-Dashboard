(function () {
    const FX_ID = 'waterland-fx';

    window.OMVTheme = {
        init({ body }) {
            if (!body || document.getElementById(FX_ID)) {
                return;
            }

            const root = document.createElement('div');
            root.id = FX_ID;
            root.setAttribute('aria-hidden', 'true');

            for (let index = 0; index < 14; index += 1) {
                const bubble = document.createElement('span');
                const size = 14 + Math.round(Math.random() * 34);
                bubble.className = 'water-bubble';
                bubble.style.setProperty('--bubble-size', `${size}px`);
                bubble.style.setProperty('--bubble-x', `${Math.round(Math.random() * 100)}vw`);
                bubble.style.setProperty('--bubble-drift', `${(-3 + Math.random() * 6).toFixed(2)}vw`);
                bubble.style.setProperty('--bubble-duration', `${16 + Math.round(Math.random() * 18)}s`);
                bubble.style.setProperty('--bubble-delay', `${(-1 * Math.random() * 24).toFixed(2)}s`);
                bubble.style.setProperty('--bubble-opacity', `${(0.18 + Math.random() * 0.28).toFixed(2)}`);
                root.appendChild(bubble);
            }

            for (let index = 0; index < 3; index += 1) {
                const fish = document.createElement('span');
                const size = 56 + Math.round(Math.random() * 44);
                fish.className = 'water-fish';
                fish.style.setProperty('--fish-size', `${size}px`);
                fish.style.setProperty('--fish-y', `${18 + Math.round(Math.random() * 58)}vh`);
                fish.style.setProperty('--fish-duration', `${26 + Math.round(Math.random() * 18)}s`);
                fish.style.setProperty('--fish-delay', `${(index * 9 + Math.random() * 8).toFixed(2)}s`);
                root.appendChild(fish);
            }

            body.appendChild(root);
        },
        destroy() {
            document.getElementById(FX_ID)?.remove();
        }
    };
})();
