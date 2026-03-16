(function () {
    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

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

    function readNumberSetting(settings, key, fallback) {
        const value = Number(settings?.[key]);
        return Number.isFinite(value) ? value : fallback;
    }

    function getBulletHoleConfig(settings) {
        const countMin = clamp(readNumberSetting(settings, "bullet-hole-count-min", 3), 0, 24);
        const countMax = clamp(readNumberSetting(settings, "bullet-hole-count-max", 6), 0, 24);
        const chanceMin = clamp(readNumberSetting(settings, "bullet-hole-chance-min", 100), 0, 100);
        const chanceMax = clamp(readNumberSetting(settings, "bullet-hole-chance-max", 100), 0, 100);
        const sizeMin = clamp(readNumberSetting(settings, "bullet-hole-size-min", 4.8), 1, 24);
        const sizeMax = clamp(readNumberSetting(settings, "bullet-hole-size-max", 8.6), 1, 24);

        return {
            countMin: Math.min(countMin, countMax),
            countMax: Math.max(countMin, countMax),
            chanceMin: Math.min(chanceMin, chanceMax),
            chanceMax: Math.max(chanceMin, chanceMax),
            sizeMin: Math.min(sizeMin, sizeMax),
            sizeMax: Math.max(sizeMin, sizeMax)
        };
    }

    function buildServiceBulletHoles(settings) {
        const config = getBulletHoleConfig(settings);
        const holes = [];
        const count = Math.floor(randomBetween(config.countMin, config.countMax));
        const chance = randomBetween(config.chanceMin, config.chanceMax) / 100;

        for (let index = 0; index < count; index += 1) {
            if (Math.random() > chance) {
                continue;
            }

            const onImage = Math.random() < 0.65;
            const x = round(randomBetween(14, 84), 2);
            const y = onImage ? round(randomBetween(14, 50), 2) : round(randomBetween(59, 84), 2);
            const size = randomBetween(config.sizeMin, config.sizeMax);
            holes.push(...buildBulletHole(x, y, size));
        }

        return holes.length ? holes.join(",\n        ") : "none";
    }

    window.OMVTheme = {
        init({document, settings}) {
            const cards = document.querySelectorAll(".service");
            cards.forEach((card) => {
                card.style.setProperty("--service-bullet-holes", buildServiceBulletHoles(settings));
            });
        }
    };
})();
