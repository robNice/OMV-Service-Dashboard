(function () {
    const FX_ID = 'bubbles-fx';

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function readCount(settings, key, fallback, max) {
        const value = Number(settings?.[key]);
        if (!Number.isFinite(value)) {
            return fallback;
        }

        return clamp(Math.round(value), 0, max);
    }

    function readRange(settings, minKey, maxKey, fallbackMin, fallbackMax, absoluteMin, absoluteMax) {
        const minValue = Number(settings?.[minKey]);
        const maxValue = Number(settings?.[maxKey]);
        const safeMin = Number.isFinite(minValue) ? clamp(minValue, absoluteMin, absoluteMax) : fallbackMin;
        const safeMax = Number.isFinite(maxValue) ? clamp(maxValue, absoluteMin, absoluteMax) : fallbackMax;

        return {
            min: Math.min(safeMin, safeMax),
            max: Math.max(safeMin, safeMax)
        };
    }

    window.OMVTheme = {
        init({ body, settings }) {
            if (!body || document.getElementById(FX_ID)) {
                return;
            }

            const root = document.createElement('div');
            root.id = FX_ID;
            root.setAttribute('aria-hidden', 'true');
            const bubbleCount = readCount(settings, 'bubble-count', 14, 60);
            const fishCount = readCount(settings, 'fish-count', 3, 12);
            const bubbleSize = readRange(settings, 'bubble-size-min', 'bubble-size-max', 14, 48, 4, 160);
            const fishSize = readRange(settings, 'fish-size-min', 'fish-size-max', 56, 100, 12, 240);

            for (let index = 0; index < bubbleCount; index += 1) {
                const bubble = document.createElement('span');
                const size = Math.round(bubbleSize.min + Math.random() * (bubbleSize.max - bubbleSize.min));
                bubble.className = 'water-bubble';
                bubble.style.setProperty('--bubble-size', `${size}px`);
                bubble.style.setProperty('--bubble-x', `${Math.round(Math.random() * 100)}vw`);
                bubble.style.setProperty('--bubble-drift', `${(-3 + Math.random() * 6).toFixed(2)}vw`);
                bubble.style.setProperty('--bubble-duration', `${16 + Math.round(Math.random() * 18)}s`);
                bubble.style.setProperty('--bubble-delay', `${(-1 * Math.random() * 24).toFixed(2)}s`);
                bubble.style.setProperty('--bubble-opacity', `${(0.18 + Math.random() * 0.28).toFixed(2)}`);
                root.appendChild(bubble);
            }

            for (let index = 0; index < fishCount; index += 1) {
                const fish = document.createElement('span');
                const size = Math.round(fishSize.min + Math.random() * (fishSize.max - fishSize.min));
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
