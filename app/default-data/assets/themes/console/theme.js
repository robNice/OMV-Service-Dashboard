(function () {
    function makeBaseKey(value) {
        const match = String(value || "").toLowerCase().match(/[a-z0-9]/);
        return match ? match[0] : "x";
    }

    function allocateKey(baseKey, usedKeys) {
        if (!usedKeys.has(baseKey)) {
            usedKeys.add(baseKey);
            return baseKey;
        }

        let suffix = 1;
        while (usedKeys.has(`${baseKey}${suffix}`)) {
            suffix += 1;
        }

        const key = `${baseKey}${suffix}`;
        usedKeys.add(key);
        return key;
    }

    window.OMVTheme = {
        init({ body, drawer, document }) {
            body?._consoleThemeCleanup?.();
            const activeNav = body?.querySelector(".section-nav-item.active");
            const header = document?.querySelector(".page-header");
            const grid = document?.querySelector(".grid");
            const backLink = header?.querySelector(".back-link");
            const navItems = Array.from(body?.querySelectorAll(".section-nav-item") || []);
            const cards = Array.from(body?.querySelectorAll(".service") || []);
            const href = activeNav?.getAttribute("href") || "";
            const match = href.match(/\/section\/([^/?#]+)/);
            const commands = [];
            const commandTargets = new Map();
            const cardOpensInNewTab = navItems.length > 0;
            const usedKeys = new Set();

            if (match) {
                header?.setAttribute("data-console-section-id", decodeURIComponent(match[1]));
                usedKeys.add("s");
                commands.push({ key: "s", label: "Show Sections" });
                if (backLink?.href) {
                    commandTargets.set("S", { href: backLink.href, newTab: false });
                }
            } else {
                header?.removeAttribute("data-console-section-id");
            }

            navItems.forEach((item) => {
                const hrefValue = item.getAttribute("href") || "";
                const idMatch = hrefValue.match(/\/section\/([^/?#]+)/);
                const sourceId = idMatch ? decodeURIComponent(idMatch[1]) : item.getAttribute("aria-label") || "";
                const key = allocateKey(makeBaseKey(sourceId), usedKeys);
                item.setAttribute("data-console-index", key);
                commands.push({
                    key,
                    label: item.getAttribute("aria-label") || sourceId || key
                });
                if (item.href) {
                    commandTargets.set(key.toUpperCase(), { href: item.href, newTab: false });
                }
            });

            cards.forEach((card) => {
                const title = card.querySelector(".service-title");
                const link = card.querySelector("a");
                const hrefValue = link?.getAttribute("href") || "";
                const sectionMatch = hrefValue.match(/\/section\/([^/?#]+)/);
                const sourceId = !cardOpensInNewTab && sectionMatch
                    ? decodeURIComponent(sectionMatch[1])
                    : (title?.textContent || hrefValue);
                const key = allocateKey(makeBaseKey(sourceId), usedKeys);
                title?.setAttribute("data-console-index", key);
                commands.push({
                    key,
                    label: title?.textContent?.trim() || key
                });
                if (link?.href) {
                    commandTargets.set(key.toUpperCase(), { href: link.href, newTab: cardOpensInNewTab });
                }
            });

            const existingPrompt = document?.querySelector(".console-prompt");
            existingPrompt?.remove();
            let prompt = null;
            let onKeyUp = null;

            if (grid) {
                prompt = document.createElement("div");
                prompt.className = "console-prompt";
                prompt.innerHTML = `
                    <span class="console-prompt-line">possible commands:</span>
                    <div class="console-prompt-list"></div>
                    <span class="console-prompt-line">choose: <span class="console-prompt-input"></span><span class="console-prompt-cursor">_</span></span>
                    <span class="console-prompt-error" aria-live="polite"></span>
                `;
                grid.insertAdjacentElement("afterend", prompt);

                const inputEl = prompt.querySelector(".console-prompt-input");
                const errorEl = prompt.querySelector(".console-prompt-error");
                const listEl = prompt.querySelector(".console-prompt-list");
                let currentInput = "";

                commands.forEach((command) => {
                    const item = document.createElement("span");
                    item.className = "console-prompt-command";
                    item.textContent = `${command.key} : ${command.label}`;
                    listEl?.appendChild(item);
                });

                const updatePrompt = () => {
                    if (inputEl) {
                        inputEl.textContent = currentInput;
                    }
                };

                const setError = (message) => {
                    if (errorEl) {
                        errorEl.textContent = message;
                    }
                };

                onKeyUp = (event) => {
                    const target = event.target;
                    const tagName = target?.tagName;
                    const isEditable =
                        target?.isContentEditable ||
                        tagName === "INPUT" ||
                        tagName === "TEXTAREA" ||
                        tagName === "SELECT";

                    if (isEditable || event.altKey || event.ctrlKey || event.metaKey) {
                        return;
                    }

                    if (event.key === "Backspace") {
                        currentInput = currentInput.slice(0, -1);
                        setError("");
                        updatePrompt();
                        return;
                    }

                    if (event.key === "Escape") {
                        currentInput = "";
                        setError("");
                        updatePrompt();
                        return;
                    }

                    if (event.key === "Enter") {
                        const command = currentInput.trim().toUpperCase();
                        const target = commandTargets.get(command);

                        if (target) {
                            if (target.newTab) {
                                window.open(target.href, "_blank", "noopener,noreferrer");
                            } else {
                                window.location.href = target.href;
                            }
                            return;
                        }

                        setError(command ? `error: unknown command "${command}"` : "error: no command entered");
                        currentInput = "";
                        updatePrompt();
                        return;
                    }

                    if (/^[a-zA-Z0-9]$/.test(event.key)) {
                        currentInput += event.key;
                        setError("");
                        updatePrompt();
                    }
                };

                updatePrompt();
                document.addEventListener("keyup", onKeyUp);
            }

            if (drawer) {
                drawer.classList.add("console-theme");
            }

            body._consoleThemeCleanup = () => {
                if (onKeyUp) {
                    document.removeEventListener("keyup", onKeyUp);
                }
                prompt?.remove();
            };
        }
    };
})();
