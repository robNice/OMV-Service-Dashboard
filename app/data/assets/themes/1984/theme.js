(function () {
    const SOURCE_CLASS = "omv-1984-source";
    const CANVAS_CLASS = "omv-1984-pixel-image";
    const DEFAULT_CARD_PIXEL_WIDTH = 40;
    const DEFAULT_CARD_PIXEL_HEIGHT = 24;
    const DEFAULT_NAV_PIXEL_WIDTH = 18;
    const DEFAULT_NAV_PIXEL_HEIGHT = 12;

    function readPixelSetting(settings, key, fallback) {
        const value = Number(settings?.[key]);
        if (!Number.isFinite(value)) {
            return fallback;
        }

        return Math.max(1, Math.round(value));
    }

    function drawPixelImage(img, canvas, pixelWidth, pixelHeight) {
        if (!img?.naturalWidth || !img?.naturalHeight || !canvas) {
            return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return;
        }

        const sourceRatio = img.naturalWidth / img.naturalHeight;
        const targetRatio = pixelWidth / pixelHeight;

        let sx = 0;
        let sy = 0;
        let sw = img.naturalWidth;
        let sh = img.naturalHeight;

        if (sourceRatio > targetRatio) {
            sw = Math.round(img.naturalHeight * targetRatio);
            sx = Math.round((img.naturalWidth - sw) / 2);
        } else if (sourceRatio < targetRatio) {
            sh = Math.round(img.naturalWidth / targetRatio);
            sy = Math.round((img.naturalHeight - sh) / 2);
        }

        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        ctx.clearRect(0, 0, pixelWidth, pixelHeight);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, pixelWidth, pixelHeight);
    }

    function pixelateImage(img, pixelWidth, pixelHeight) {
        if (!img || img.dataset.omv1984Pixelized === "true") {
            return;
        }

        const link = img.closest("a");
        if (!link) {
            return;
        }

        let canvas = link.querySelector(`canvas.${CANVAS_CLASS}`);
        if (!canvas) {
            canvas = document.createElement("canvas");
            canvas.className = CANVAS_CLASS;
            canvas.setAttribute("aria-hidden", "true");
            link.insertBefore(canvas, img);
        }

        img.classList.add(SOURCE_CLASS);

        const render = () => {
            drawPixelImage(img, canvas, pixelWidth, pixelHeight);
            img.dataset.omv1984Pixelized = "true";
        };

        if (img.complete && img.naturalWidth) {
            render();
            return;
        }

        img.addEventListener("load", render, { once: true });
    }

    function initPixelation(root, settings) {
        const cardPixelWidth = readPixelSetting(settings, "card-pixel-width", DEFAULT_CARD_PIXEL_WIDTH);
        const cardPixelHeight = readPixelSetting(settings, "card-pixel-height", DEFAULT_CARD_PIXEL_HEIGHT);
        const navPixelWidth = readPixelSetting(settings, "nav-pixel-width", DEFAULT_NAV_PIXEL_WIDTH);
        const navPixelHeight = readPixelSetting(settings, "nav-pixel-height", DEFAULT_NAV_PIXEL_HEIGHT);

        root.querySelectorAll(".service img").forEach((img) => {
            pixelateImage(img, cardPixelWidth, cardPixelHeight);
        });

        root.querySelectorAll(".section-nav-item img").forEach((img) => {
            pixelateImage(img, navPixelWidth, navPixelHeight);
        });
    }

    window.OMVTheme = {
        init({ document, settings }) {
            initPixelation(document, settings);
        },
        destroy({ document }) {
            document.querySelectorAll(`.${SOURCE_CLASS}`).forEach((img) => {
                img.classList.remove(SOURCE_CLASS);
                delete img.dataset.omv1984Pixelized;
            });

            document.querySelectorAll(`canvas.${CANVAS_CLASS}`).forEach((canvas) => {
                canvas.remove();
            });
        }
    };
})();
