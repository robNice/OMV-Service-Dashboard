(function () {
    'use strict';

    const AUTOPLAY_INTERVAL_MS = 4000;

    let _state = null;

    // ── Read responsive positions from CSS custom properties ──
    function readPositions() {
        const cs = getComputedStyle(document.documentElement);
        const n  = k => parseFloat(cs.getPropertyValue(k).trim()) || 0;
        return [
            [0, 0, 0, 1, 1, 10],
            [n('--spin-pos1-tx'), n('--spin-pos1-tz'), n('--spin-pos1-ry'), n('--spin-pos1-sc'), n('--spin-pos1-op'), 7],
            [n('--spin-pos2-tx'), n('--spin-pos2-tz'), n('--spin-pos2-ry'), n('--spin-pos2-sc'), n('--spin-pos2-op'), 4],
        ];
    }

    // ── Helpers ───────────────────────────────────────────────

    function wrappedOffset(index, active, total) {
        let off = index - active;
        if (off >  total / 2) off -= total;
        if (off < -total / 2) off += total;
        return off;
    }

    function applyCardPosition(card, off, positions) {
        const abs = Math.abs(off);

        if (abs >= positions.length) {
            const sign = off >= 0 ? 1 : -1;
            const last = positions[positions.length - 1];
            const tx = (last ? last[0] : 0) + 180;
            const tz = last ? last[1] : 0;
            const ry = last ? last[2] : 0;
            const scale = last ? last[3] : 0.5;

            card.style.opacity    = '0';
            card.style.visibility = 'hidden';
            card.style.zIndex     = '0';
            card.style.transform  =
                `translate(-50%, -50%) ` +
                `perspective(1100px) ` +
                `translateX(${sign * tx}px) ` +
                `translateZ(${tz}px) ` +
                `rotateY(${sign * ry}deg) ` +
                `scale(${scale})`;
            return;
        }

        const sign = off >= 0 ? 1 : -1;
        const [tx, tz, ry, scale, opacity, zIdx] = positions[abs];

        card.style.visibility = 'visible';
        card.style.opacity    = String(opacity);
        card.style.zIndex     = String(zIdx);
        card.style.transform  =
            `translate(-50%, -50%) ` +
            `perspective(1100px) ` +
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

            // Build DOM before adding the class so the FOUC-prevention CSS rule
            // (grid:not(.spin-carousel-active) { opacity:0 }) stays active until
            // the wrapper's fade-in animation starts running.
            const dom = buildDOM(grid, cards);
            grid.classList.add('spin-carousel-active');

            if (hasReflection) body.classList.add('spin-has-reflection');

            doc.documentElement.classList.add('spin-no-scroll');
            body.classList.add('spin-no-scroll');

            let positions = readPositions();
            let active    = 0;
            let autoTimer = null;
            let jumpRestoreRun = 0;
            let jumpRestoreFrameOne = null;
            let jumpRestoreFrameTwo = null;

            function cancelPendingJumpRestore() {
                jumpRestoreRun += 1;

                if (jumpRestoreFrameOne !== null) {
                    cancelAnimationFrame(jumpRestoreFrameOne);
                    jumpRestoreFrameOne = null;
                }

                if (jumpRestoreFrameTwo !== null) {
                    cancelAnimationFrame(jumpRestoreFrameTwo);
                    jumpRestoreFrameTwo = null;
                }

                cards.forEach(card => {
                    if (card.dataset.spinJumpPending === '1') {
                        delete card.dataset.spinJumpPending;
                        card.style.transition = '';
                    }
                });
            }

            // ── Position all cards ──
            function updatePositions(instant) {
                if (instant) {
                    cards.forEach(c => { c.style.transition = 'none'; });
                }

                cards.forEach((card, i) => {
                    const off = wrappedOffset(i, active, cards.length);
                    applyCardPosition(card, off, positions);
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

            // ── Navigation with fade-jump for wrap-around cards ───────────
            //
            // Cards that change sign while still in the visible range (e.g.
            // offset -1 → +2) would fly through the centre card, causing the
            // wrong z-order.  The fix:
            //
            //   1. Set transition:none on jump cards.
            //   2. FORCED REFLOW — this is the critical step.  rAF fires in
            //      the same frame as the click handler (before style-calc), so
            //      a double-rAF alone does NOT reliably commit transition:none
            //      before the property change.  void offsetHeight forces the
            //      browser to flush all pending style assignments NOW so that
            //      transition:none is already the computed value when we change
            //      the transform.
            //   3. Update positions — jump cards teleport instantly (invisible),
            //      other cards animate normally with their CSS transition.
            //   4. Double-rAF in Frame N+1: restore transition + fade opacity
            //      from 0 to target → smooth fade-in at the new position.
            function navigateTo(newActive) {
                const total  = cards.length;
                const visRad = positions.length - 1;
                newActive = ((newActive % total) + total) % total;
                if (newActive === active) return;

                cancelPendingJumpRestore();
                const restoreRun = jumpRestoreRun;

                const jumpSet = new Set();
                cards.forEach((card, i) => {
                    const oldOff = wrappedOffset(i, active, total);
                    const newOff = wrappedOffset(i, newActive, total);
                    if (
                        oldOff !== 0 && newOff !== 0 &&
                        Math.sign(oldOff) !== Math.sign(newOff) &&
                        Math.abs(oldOff) <= visRad &&
                        Math.abs(newOff) <= visRad
                    ) {
                        jumpSet.add(i);
                        card.dataset.spinJumpPending = '1';
                        card.style.transition = 'none';
                    }
                });

                // Flush style assignments so transition:none is committed
                // before the transform/opacity changes below.
                if (jumpSet.size > 0) {
                    void document.body.offsetHeight; // forced reflow
                }

                active = newActive;
                updatePositions(false);

                // applyCardPosition set the target opacity; override to 0 so
                // jump cards are invisible at their new position.
                jumpSet.forEach(i => { cards[i].style.opacity = '0'; });

                if (jumpSet.size > 0) {
                    // Double-rAF: rAF queued from within a rAF fires in the
                    // NEXT frame (per spec).  By Frame N+1 the browser has
                    // already painted the instant, invisible positions.
                    // Restoring the transition here triggers a proper fade-in.
                    jumpRestoreFrameOne = requestAnimationFrame(() => {
                        jumpRestoreFrameOne = null;
                        jumpRestoreFrameTwo = requestAnimationFrame(() => {
                            jumpRestoreFrameTwo = null;
                            if (restoreRun !== jumpRestoreRun) return;

                            jumpSet.forEach(i => {
                                const card  = cards[i];
                                const off   = wrappedOffset(i, active, total);
                                const abs   = Math.abs(off);
                                const tgtOp = abs < positions.length
                                    ? positions[abs][4]
                                    : 0;
                                delete card.dataset.spinJumpPending;
                                card.style.transition = '';
                                card.style.opacity    = String(tgtOp);
                            });
                        });
                    });
                }
            }

            function go(delta) {
                navigateTo((active + delta + cards.length) % cards.length);
                resetAutoplay();
            }

            function goTo(i) {
                navigateTo(((i % cards.length) + cards.length) % cards.length);
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

            // ── Viewport resize — re-read positions from CSS ──
            const onResize = () => {
                positions = readPositions();
                updatePositions(true);
            };
            window.addEventListener('resize', onResize);

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

            updatePositions(true);
            startAutoplay();

            _state = {
                grid, cards, dom, body, doc,
                stopAutoplay, onKey, onTouchStart, onTouchEnd, onResize,
                cancelPendingJumpRestore
            };
        },

        destroy() {
            if (!_state) return;
            const { grid, cards, dom, body, doc,
                    stopAutoplay, onKey, onTouchStart, onTouchEnd, onResize,
                    cancelPendingJumpRestore } = _state;

            stopAutoplay();
            cancelPendingJumpRestore();
            doc.removeEventListener('keydown', onKey);
            window.removeEventListener('resize', onResize);
            dom.scene.removeEventListener('touchstart', onTouchStart);
            dom.scene.removeEventListener('touchend',   onTouchEnd);

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
            doc.documentElement.classList.remove('spin-no-scroll');
            body.classList.remove('spin-no-scroll');

            _state = null;
        }
    };
})();
