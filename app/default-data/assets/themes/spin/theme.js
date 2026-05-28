(function () {
    'use strict';

    // ── Carousel position table ───────────────────────────────
    // Each row: [translateX (px), translateZ (px), rotateY (deg), scale, opacity, zIndex]
    // Index 0 = active card, index N = Nth card from center.
    // Signs for X and Y are mirrored for negative offsets in code.
    const POSITIONS = [
        [   0,    0,   0,  1.00, 1.00, 10],  // 0 — center/active
        [ 290,  -90, -42,  0.82, 0.78,  7],  // ±1
        [ 468, -195, -62,  0.63, 0.50,  4],  // ±2
    ];

    const AUTOPLAY_INTERVAL_MS = 4000;

    let _state = null;

    // ── Helpers ───────────────────────────────────────────────

    function wrappedOffset(index, active, total) {
        let off = index - active;
        if (off >  total / 2) off -= total;
        if (off < -total / 2) off += total;
        return off;
    }

    function applyCardPosition(card, off) {
        const abs = Math.abs(off);

        if (abs >= POSITIONS.length) {
            card.style.opacity    = '0';
            card.style.visibility = 'hidden';
            card.style.zIndex     = '0';
            card.style.transform  = 'translate(-50%, -50%) translateZ(-600px) scale(0.3)';
            return;
        }

        const sign = off >= 0 ? 1 : -1;
        const [tx, tz, ry, scale, opacity, zIdx] = POSITIONS[abs];

        card.style.visibility = 'visible';
        card.style.opacity    = String(opacity);
        card.style.zIndex     = String(zIdx);
        card.style.transform  =
            `translate(-50%, -50%) ` +
            `translateX(${sign * tx}px) ` +
            `translateZ(${tz}px) ` +
            `rotateY(${sign * ry}deg) ` +
            `scale(${scale})`;
    }

    // ── DOM construction ──────────────────────────────────────

    function buildDOM(grid, cards) {
        const wrapper = document.createElement('div');
        wrapper.className = 'spin-wrapper';

        const scene = document.createElement('div');
        scene.className = 'spin-scene';

        const track = document.createElement('div');
        track.className = 'spin-track';

        cards.forEach(c => track.appendChild(c));
        scene.appendChild(track);

        let btnPrev = null;
        let btnNext = null;

        if (cards.length > 1) {
            btnPrev = document.createElement('button');
            btnPrev.type = 'button';
            btnPrev.className = 'spin-btn spin-btn-prev';
            btnPrev.setAttribute('aria-label', 'Previous');
            btnPrev.innerHTML = '&#8249;';

            btnNext = document.createElement('button');
            btnNext.type = 'button';
            btnNext.className = 'spin-btn spin-btn-next';
            btnNext.setAttribute('aria-label', 'Next');
            btnNext.innerHTML = '&#8250;';

            scene.appendChild(btnPrev);
            scene.appendChild(btnNext);
        }

        wrapper.appendChild(scene);

        const dotsRow = document.createElement('div');
        dotsRow.className = 'spin-dots';

        if (cards.length > 1) {
            cards.forEach((_, i) => {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'spin-dot';
                dot.dataset.spinIdx = String(i);
                dot.setAttribute('aria-label', `Item ${i + 1}`);
                dotsRow.appendChild(dot);
            });
            wrapper.appendChild(dotsRow);
        }

        grid.appendChild(wrapper);

        return { wrapper, scene, track, btnPrev, btnNext, dotsRow };
    }

    // ── Theme API ─────────────────────────────────────────────

    window.OMVTheme = {

        init({ body, document: doc, settings }) {
            const grid = doc.querySelector('.grid');
            if (!grid) return;

            const cards = Array.from(grid.querySelectorAll(':scope > .service'));
            if (cards.length === 0) return;

            const hasReflection = settings && settings['show-reflection'] !== false;
            const wantsAutoplay  = settings && settings['autoplay'] === true;

            grid.classList.add('spin-carousel-active');
            if (hasReflection) body.classList.add('spin-has-reflection');

            const dom = buildDOM(grid, cards);

            let active = 0;
            let autoTimer = null;

            // ── Position all cards ──
            function updatePositions(instant) {
                if (instant) {
                    cards.forEach(c => { c.style.transition = 'none'; });
                }

                cards.forEach((card, i) => {
                    const off = wrappedOffset(i, active, cards.length);
                    applyCardPosition(card, off);
                    card.classList.toggle('spin-active', off === 0);
                });

                dom.dotsRow.querySelectorAll('.spin-dot').forEach((dot, i) => {
                    dot.classList.toggle('active', i === active);
                });

                if (instant) {
                    requestAnimationFrame(() => {
                        cards.forEach(c => { c.style.transition = ''; });
                    });
                }
            }

            // ── Navigation ──
            function go(delta) {
                active = (active + delta + cards.length) % cards.length;
                updatePositions(false);
                resetAutoplay();
            }

            function goTo(i) {
                active = ((i % cards.length) + cards.length) % cards.length;
                updatePositions(false);
                resetAutoplay();
            }

            // ── Autoplay ──
            function startAutoplay() {
                if (!wantsAutoplay || autoTimer !== null) return;
                autoTimer = setInterval(() => go(1), AUTOPLAY_INTERVAL_MS);
            }

            function stopAutoplay() {
                if (autoTimer !== null) {
                    clearInterval(autoTimer);
                    autoTimer = null;
                }
            }

            function resetAutoplay() {
                stopAutoplay();
                startAutoplay();
            }

            // ── Event listeners ──
            if (dom.btnPrev) dom.btnPrev.addEventListener('click', () => go(-1));
            if (dom.btnNext) dom.btnNext.addEventListener('click', () => go(1));

            dom.dotsRow.querySelectorAll('.spin-dot').forEach(dot => {
                dot.addEventListener('click', () => goTo(Number(dot.dataset.spinIdx)));
            });

            cards.forEach((card, i) => {
                card.addEventListener('click', e => {
                    if (wrappedOffset(i, active, cards.length) !== 0) {
                        e.preventDefault();
                        goTo(i);
                    }
                });
            });

            const onKey = e => {
                if (e.key === 'ArrowLeft')  { e.preventDefault(); go(-1); }
                if (e.key === 'ArrowRight') { e.preventDefault(); go(1);  }
            };
            doc.addEventListener('keydown', onKey);

            let touchStartX = 0;
            const onTouchStart = e => { touchStartX = e.touches[0].clientX; };
            const onTouchEnd   = e => {
                const delta = touchStartX - e.changedTouches[0].clientX;
                if (Math.abs(delta) > 48) go(delta > 0 ? 1 : -1);
            };
            dom.scene.addEventListener('touchstart', onTouchStart, { passive: true });
            dom.scene.addEventListener('touchend',   onTouchEnd,   { passive: true });

            dom.scene.addEventListener('mouseenter', stopAutoplay);
            dom.scene.addEventListener('mouseleave', startAutoplay);

            // Initial render without animation
            updatePositions(true);
            startAutoplay();

            _state = { grid, cards, dom, body, doc, stopAutoplay, onKey, onTouchStart, onTouchEnd };
        },

        destroy() {
            if (!_state) return;
            const { grid, cards, dom, body, doc, stopAutoplay, onKey, onTouchStart, onTouchEnd } = _state;

            stopAutoplay();
            doc.removeEventListener('keydown', onKey);
            dom.scene.removeEventListener('touchstart', onTouchStart);
            dom.scene.removeEventListener('touchend',   onTouchEnd);

            // Restore cards to grid and clear inline styles
            cards.forEach(card => {
                card.style.transform  = '';
                card.style.opacity    = '';
                card.style.zIndex     = '';
                card.style.visibility = '';
                card.style.transition = '';
                card.classList.remove('spin-active');
                grid.appendChild(card);
            });

            dom.wrapper.remove();
            grid.classList.remove('spin-carousel-active');
            body.classList.remove('spin-has-reflection');

            _state = null;
        }
    };
})();
