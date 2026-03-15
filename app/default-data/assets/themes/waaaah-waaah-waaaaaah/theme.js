(function () {
    function randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    function round(value, digits) {
        const factor = 10 ** digits;
        return Math.round(value * factor) / factor;
    }

    function buildBulletHole(x, y, size) {
        const core = round(size * 0.32, 2);
        const burn = round(size * 0.58, 2);
        const splinter = round(size * 0.92, 2);
        const fade = round(size * 0.94, 2);
        const shadowW = round(size * 1.45, 2);
        const shadowH = round(size * 0.82, 2);
        const shadowX = round(x + randomBetween(0.5, 1.1), 2);
        const shadowY = round(y + randomBetween(0.6, 1.3), 2);

        return [
            `radial-gradient(circle at ${x}% ${y}%, rgba(18, 10, 5, 0.96) 0 ${core}px, rgba(73, 42, 22, 0.93) ${round(core + 0.1, 2)}px ${burn}px, rgba(227, 194, 149, 0.28) ${round(burn + 0.1, 2)}px ${splinter}px, transparent ${fade}px)`,
            `radial-gradient(ellipse ${shadowW}px ${shadowH}px at ${shadowX}% ${shadowY}%, rgba(0, 0, 0, 0.28) 0 45%, transparent 68%)`
        ];
    }

    function buildServiceBulletHoles() {
        const holes = [];
        const count = Math.floor(randomBetween(3, 6));

        for (let index = 0; index < count; index += 1) {
            const onImage = Math.random() < 0.65;
            const x = round(randomBetween(14, 84), 2);
            const y = onImage ? round(randomBetween(14, 50), 2) : round(randomBetween(59, 84), 2);
            const size = onImage ? randomBetween(5.4, 8.6) : randomBetween(4.8, 7.6);
            holes.push(...buildBulletHole(x, y, size));
        }

        return holes.join(",\n        ");
    }

    window.OMVTheme = {
        init({document}) {
            const cards = document.querySelectorAll(".service");
            cards.forEach((card) => {
                card.style.setProperty("--service-bullet-holes", buildServiceBulletHoles());
            });
        }
    };
})();
