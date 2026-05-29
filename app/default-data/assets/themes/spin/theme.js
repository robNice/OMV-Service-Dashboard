(function () {
    'use strict';

    const AUTOPLAY_INTERVAL_MS = 4000;
    const DOT_ROLL_STEP_MS = 560;
    const EXIT_FADE_MS = 560;

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

    function wrappedOffset(index, active, total, tieBias) {
        let off = index - active;
        const half = total / 2;
        if (total % 2 === 0 && Math.abs(off) === half) {
            return (tieBias < 0 ? -1 : 1) * half;
        }
        if (off >  total / 2) off -= total;
        if (off < -total / 2) off += total;
        return off;
    }

    function directionBetween(from, to, total) {
        const forward = (to - from + total) % total;
        const backward = (from - to + total) % total;
        if (forward === 0) return 0;
        return forward <= backward ? 1 : -1;
    }

    function buildTransform(off, positions, extraTransform) {
        const abs = Math.abs(off);

        if (abs >= positions.length) {
            const sign = off >= 0 ? 1 : -1;
            const last = positions[positions.length - 1];
            const tx = (last ? last[0] : 0) + 180;
            const tz = last ? last[1] : 0;
            const ry = last ? last[2] : 0;
            const scale = last ? last[3] : 0.5;

            return {
                opacity: 0,
                zIndex: 0,
                transform:
                    `translate(-50%, -50%) ` +
                    `perspective(1100px) ` +
                    `translateX(${sign * tx}px) ` +
                    `translateZ(${tz}px) ` +
                    `rotateY(${sign * ry}deg) ` +
                    `scale(${scale})` +
                    (extraTransform ? ` ${extraTransform}` : '')
            };
        }

        const sign = off >= 0 ? 1 : -1;
        const [tx, tz, ry, scale, opacity, zIdx] = positions[abs];

        return {
            opacity,
            zIndex: zIdx,
            transform:
                `translate(-50%, -50%) ` +
                `perspective(1100px) ` +
                `translateX(${sign * tx}px) ` +
                `translateZ(${tz}px) ` +
                `rotateY(${sign * ry}deg) ` +
                `scale(${scale})` +
                (extraTransform ? ` ${extraTransform}` : '')
        };
    }

    function applyCardPosition(card, off, positions) {
        const pos = buildTransform(off, positions);
        const isHidden = Math.abs(off) >= positions.length;
        const isExiting = card.dataset.spinExitPending === '1';

        card.style.visibility = isHidden && !isExiting ? 'hidden' : 'visible';
        card.style.opacity    = String(pos.opacity);
        card.style.zIndex     = String(pos.zIndex);
        card.style.transform  = pos.transform;
    }

    function applyReflectionPosition(reflection, off, positions) {
        const pos = buildTransform(off, positions, 'translateY(var(--spin-reflection-offset)) scaleY(-1)');
        const isHidden = Math.abs(off) >= positions.length;
        const isExiting = reflection.dataset.spinExitPending === '1';

        reflection.style.visibility = isHidden && !isExiting ? 'hidden' : 'visible';
        reflection.style.opacity    = String(pos.opacity);
        reflection.style.zIndex     = String(Math.max(0, pos.zIndex - 1));
        reflection.style.transform  = pos.transform;
    }

    function applyExitPosition(el, oldOff, positions, extraTransform) {
        const inward = oldOff > 0 ? -1 : 1;
        const pos = buildTransform(
            oldOff,
            positions,
            `translateX(${inward * 34}px) scale(0.96)${extraTransform ? ` ${extraTransform}` : ''}`
        );

        el.style.visibility = 'visible';
        el.style.opacity    = '0';
        el.style.zIndex     = String(pos.zIndex);
        el.style.transform  = pos.transform;
    }

    // ── DOM construction ──────────────────────────────────────

    function buildDOM(grid, cards, hasReflection) {
        const wrapper = document.createElement('div');
        wrapper.className = 'spin-wrapper';

        const scene = document.createElement('div');
        scene.className = 'spin-scene';

        const track = document.createElement('div');
        track.className = 'spin-track';

        const reflections = [];

        if (hasReflection) {
            cards.forEach(card => {
                const reflection = document.createElement('div');
                reflection.className = 'spin-reflection';
                reflection.setAttribute('aria-hidden', 'true');
                reflection.innerHTML = card.innerHTML;
                reflection.querySelectorAll('a, button, input, textarea, select').forEach(el => {
                    el.tabIndex = -1;
                    el.setAttribute('aria-hidden', 'true');
                });
                reflections.push(reflection);
                track.appendChild(reflection);
            });
        }

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

        return { wrapper, scene, track, btnPrev, btnNext, dotsRow, reflections };
    }

    function moveBackLinkIntoSectionNav(doc) {
        const backLink = doc.querySelector('.page-header > .back-link');
        const sectionNav = doc.querySelector('.page-header .section-nav');
        if (!backLink || !sectionNav) {
            return null;
        }

        const originalParent = backLink.parentNode;
        const originalNextSibling = backLink.nextSibling;
        const iconLink = doc.createElement('a');

        iconLink.className = 'spin-section-back';
        iconLink.href = backLink.href;
        iconLink.title = backLink.textContent.trim();
        iconLink.setAttribute('aria-label', backLink.textContent.trim());
        iconLink.setAttribute('data-spin-back', 'true');

        backLink.remove();
        sectionNav.insertBefore(iconLink, sectionNav.firstChild);

        return { backLink, originalParent, originalNextSibling, iconLink };
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
            const backLinkState = moveBackLinkIntoSectionNav(doc);

            // Build DOM before adding the class so the FOUC-prevention CSS rule
            // (grid:not(.spin-carousel-active) { opacity:0 }) stays active until
            // the wrapper's fade-in animation starts running.
            const dom = buildDOM(grid, cards, hasReflection);
            grid.classList.add('spin-carousel-active');

            if (hasReflection) body.classList.add('spin-has-reflection');

            doc.documentElement.classList.add('spin-no-scroll');
            body.classList.add('spin-no-scroll');

            let positions = readPositions();
            let active    = 0;
            let offsetTieBias = 1;
            let autoTimer = null;
            let rollTimer = null;
            let rollRun = 0;
            let jumpRestoreRun = 0;
            let jumpRestoreFrameOne = null;
            let jumpRestoreFrameTwo = null;
            let navigationRun = 0;
            const exitTimers = new Map();

            function clearExitTimer(i) {
                if (exitTimers.has(i)) {
                    clearTimeout(exitTimers.get(i));
                    exitTimers.delete(i);
                }

                delete cards[i].dataset.spinExitPending;

                if (dom.reflections[i]) {
                    delete dom.reflections[i].dataset.spinExitPending;
                }
            }

            function clearAllExitTimers() {
                cards.forEach((_, i) => clearExitTimer(i));
            }

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

                dom.reflections.forEach(reflection => {
                    if (reflection.dataset.spinJumpPending === '1') {
                        delete reflection.dataset.spinJumpPending;
                        reflection.style.transition = '';
                    }
                });
            }

            function cancelRolling() {
                rollRun += 1;

                if (rollTimer !== null) {
                    clearTimeout(rollTimer);
                    rollTimer = null;
                }
            }

            // ── Position all cards ──
            function updatePositions(instant) {
                if (instant) {
                    cards.forEach(c => { c.style.transition = 'none'; });
                }

                cards.forEach((card, i) => {
                    if (card.dataset.spinExitPending === '1') {
                        return;
                    }

                    const off = wrappedOffset(i, active, cards.length, offsetTieBias);
                    applyCardPosition(card, off, positions);
                    if (dom.reflections[i]) {
                        applyReflectionPosition(dom.reflections[i], off, positions);
                    }
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

                navigationRun += 1;
                const currentNavigationRun = navigationRun;
                clearAllExitTimers();
                cancelPendingJumpRestore();
                const restoreRun = jumpRestoreRun;
                const nextTieBias = offsetTieBias;

                const jumpSet = new Set();
                const exitSet = new Map();
                cards.forEach((card, i) => {
                    const oldOff = wrappedOffset(i, active, total, offsetTieBias);
                    const newOff = wrappedOffset(i, newActive, total, nextTieBias);
                    const oldAbs = Math.abs(oldOff);
                    const newAbs = Math.abs(newOff);
                    const oldOpacity = oldAbs < positions.length ? positions[oldAbs][4] : 0;
                    const newOpacity = newAbs < positions.length ? positions[newAbs][4] : 0;
                    if (
                        oldOff !== 0 &&
                        newOff !== 0 &&
                        (
                            (
                                Math.sign(oldOff) !== Math.sign(newOff) &&
                                oldAbs <= visRad &&
                                newAbs <= visRad
                            ) ||
                            (
                                oldAbs > visRad &&
                                newAbs === 1
                            )
                        )
                    ) {
                        clearExitTimer(i);
                        jumpSet.add(i);
                        card.dataset.spinJumpPending = '1';
                        card.style.transition = 'none';
                        if (dom.reflections[i]) {
                            dom.reflections[i].dataset.spinJumpPending = '1';
                            dom.reflections[i].style.transition = 'none';
                        }
                    }

                    if (oldOpacity > 0 && newOpacity <= 0) {
                        clearExitTimer(i);
                        exitSet.set(i, oldOff);
                        card.dataset.spinExitPending = '1';
                        if (dom.reflections[i]) {
                            dom.reflections[i].dataset.spinExitPending = '1';
                        }
                    }
                });

                // Flush style assignments so transition:none is committed
                // before the transform/opacity changes below.
                if (jumpSet.size > 0) {
                    void document.body.offsetHeight; // forced reflow
                }

                active = newActive;
                offsetTieBias = nextTieBias;
                updatePositions(false);

                exitSet.forEach((oldOff, i) => {
                    applyExitPosition(cards[i], oldOff, positions);
                    if (dom.reflections[i]) {
                        applyExitPosition(
                            dom.reflections[i],
                            oldOff,
                            positions,
                            'translateY(var(--spin-reflection-offset)) scaleY(-1)'
                        );
                    }
                });

                // applyCardPosition set the target opacity; override to 0 so
                // jump cards are invisible at their new position.
                jumpSet.forEach(i => {
                    cards[i].style.opacity = '0';
                    if (dom.reflections[i]) {
                        dom.reflections[i].style.opacity = '0';
                    }
                });

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
                                const off   = wrappedOffset(i, active, total, offsetTieBias);
                                const abs   = Math.abs(off);
                                const tgtOp = abs < positions.length
                                    ? positions[abs][4]
                                    : 0;
                                delete card.dataset.spinJumpPending;
                                card.style.transition = '';
                                card.style.opacity    = String(tgtOp);

                                if (dom.reflections[i]) {
                                    delete dom.reflections[i].dataset.spinJumpPending;
                                    dom.reflections[i].style.transition = '';
                                    dom.reflections[i].style.opacity    = String(tgtOp);
                                }
                            });
                        });
                    });
                }

                if (exitSet.size > 0) {
                    exitSet.forEach((_, i) => {
                        const timer = setTimeout(() => {
                            if (currentNavigationRun !== navigationRun) return;

                            exitTimers.delete(i);
                            delete cards[i].dataset.spinExitPending;
                            cards[i].style.visibility = 'hidden';

                            if (dom.reflections[i]) {
                                delete dom.reflections[i].dataset.spinExitPending;
                                dom.reflections[i].style.visibility = 'hidden';
                            }
                        }, EXIT_FADE_MS);

                        exitTimers.set(i, timer);
                    });
                }
            }

            function go(delta) {
                cancelRolling();
                navigateTo((active + delta + cards.length) % cards.length);
                resetAutoplay();
            }

            function goTo(i) {
                const total = cards.length;
                const target = ((i % total) + total) % total;
                if (target === active) {
                    cancelRolling();
                    resetAutoplay();
                    return;
                }

                cancelRolling();
                stopAutoplay();

                const direction = directionBetween(active, target, total);
                const run = rollRun;

                function rollStep() {
                    if (run !== rollRun) return;

                    navigateTo((active + direction + total) % total);

                    if (active === target) {
                        rollTimer = null;
                        resetAutoplay();
                        return;
                    }

                    rollTimer = setTimeout(rollStep, DOT_ROLL_STEP_MS);
                }

                rollStep();
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
                    if (wrappedOffset(i, active, cards.length, offsetTieBias) !== 0) {
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
                grid, cards, dom, body, doc, backLinkState,
                stopAutoplay, onKey, onTouchStart, onTouchEnd, onResize,
                cancelPendingJumpRestore, cancelRolling, clearAllExitTimers
            };
        },

        destroy() {
            if (!_state) return;
            const { grid, cards, dom, body, doc, backLinkState,
                    stopAutoplay, onKey, onTouchStart, onTouchEnd, onResize,
                    cancelPendingJumpRestore, cancelRolling, clearAllExitTimers } = _state;

            stopAutoplay();
            cancelRolling();
            clearAllExitTimers();
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

            if (backLinkState) {
                const { backLink, originalParent, originalNextSibling, iconLink } = backLinkState;
                iconLink.remove();
                originalParent.insertBefore(backLink, originalNextSibling);
            }

            grid.classList.remove('spin-carousel-active');
            body.classList.remove('spin-has-reflection');
            doc.documentElement.classList.remove('spin-no-scroll');
            body.classList.remove('spin-no-scroll');

            _state = null;
        }
    };
})();
