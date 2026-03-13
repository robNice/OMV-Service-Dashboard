(function () {
    const ROOT_ID = 'flower-rain';

    window.OMVTheme = {
        init({ body }) {
            if (!body || document.getElementById(ROOT_ID)) {
                return;
            }

            const colors = [
                { petal: '#ffd84b', alt: '#5ebf63', center: '#f5568e' },
                { petal: '#f5568e', alt: '#ffd84b', center: '#1ba7a0' },
                { petal: '#5ebf63', alt: '#ffd84b', center: '#f37b34' },
                { petal: '#1ba7a0', alt: '#f5568e', center: '#ffd84b' }
            ];
            const rain = document.createElement('div');
            rain.id = ROOT_ID;
            rain.setAttribute('aria-hidden', 'true');

            for (let index = 0; index < 18; index += 1) {
                const flower = document.createElement('span');
                const palette = colors[index % colors.length];
                const size = 22 + Math.round(Math.random() * 34);
                flower.className = 'flower-rain__flower';
                flower.style.setProperty('--flower-size', `${size}px`);
                flower.style.setProperty('--flower-x', `${Math.round(Math.random() * 100)}vw`);
                flower.style.setProperty('--flower-drift', `${-10 + Math.round(Math.random() * 20)}vw`);
                flower.style.setProperty('--flower-sway', `${(-1 + Math.random() * 2).toFixed(2)}vw`);
                flower.style.setProperty('--flower-duration', `${12 + Math.round(Math.random() * 12)}s`);
                flower.style.setProperty('--flower-spin', `${5 + Math.round(Math.random() * 5)}s`);
                flower.style.setProperty('--flower-delay', `${(-1 * Math.random() * 18).toFixed(2)}s`);
                flower.style.setProperty('--flower-opacity', `${(0.35 + Math.random() * 0.45).toFixed(2)}`);
                flower.style.setProperty('--flower-petal', palette.petal);
                flower.style.setProperty('--flower-petal-alt', palette.alt);
                flower.style.setProperty('--flower-center', palette.center);
                flower.style.setProperty('--flower-tilt', `${-25 + Math.round(Math.random() * 50)}deg`);
                rain.appendChild(flower);
            }

            body.appendChild(rain);
        },
        destroy() {
            document.getElementById(ROOT_ID)?.remove();
        }
    };
})();
