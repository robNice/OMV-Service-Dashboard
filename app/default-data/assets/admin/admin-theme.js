const root = document.getElementById("theme-settings");
const listEl = document.getElementById("theme-list");
const saveBtn = document.getElementById("theme-save");
const resetBtn = document.getElementById("theme-reset");
const statusEl = document.getElementById("theme-status");
const configTitleEl = document.getElementById("theme-config-title");
const configDescriptionEl = document.getElementById("theme-config-description");
const configEmptyEl = document.getElementById("theme-config-empty");
const configFormEl = document.getElementById("theme-config-form");
const modalEl = document.getElementById("theme-config-modal");
const modalCloseBtn = document.getElementById("theme-modal-close");

let currentTheme = root.dataset.currentTheme || "classic";
let selectedTheme = currentTheme;
let modalTheme = currentTheme;
let themes = [];
let themeSettings = {};
let drafts = {};

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function setStatus(message, tone = "") {
    statusEl.textContent = message || "";
    statusEl.className = tone ? `save-status ${tone}` : "save-status";
    statusEl.dataset.tone = tone || "";
    statusEl.classList.toggle("is-visible", Boolean(message));
    statusEl.classList.remove("is-fading");
}

function getThemeById(themeId) {
    return themes.find((theme) => theme.id === themeId) || null;
}

function getDefaultSettings(theme) {
    return Object.fromEntries((theme?.settings || []).map((setting) => [setting.id, setting.default]));
}

function getSavedSettings(themeId) {
    const theme = getThemeById(themeId);
    return {
        ...getDefaultSettings(theme),
        ...(themeSettings[themeId] || {})
    };
}

function getDraftSettings(themeId) {
    return drafts[themeId]
        ? { ...getSavedSettings(themeId), ...drafts[themeId] }
        : getSavedSettings(themeId);
}

function normalizeValue(setting, value) {
    if (setting.type === "boolean") {
        return Boolean(value);
    }

    if (setting.type === "number" || setting.type === "range") {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : Number(setting.default) || 0;
    }

    return String(value ?? "");
}

function getComparableSettings(themeId, source) {
    const theme = getThemeById(themeId);
    return Object.fromEntries((theme?.settings || []).map((setting) => [
        setting.id,
        normalizeValue(setting, source[setting.id] ?? setting.default)
    ]));
}

function hasUnsavedChanges() {
    if (selectedTheme !== currentTheme) {
        return true;
    }

    const saved = getComparableSettings(selectedTheme, getSavedSettings(selectedTheme));
    const draft = getComparableSettings(selectedTheme, getDraftSettings(selectedTheme));
    return JSON.stringify(saved) !== JSON.stringify(draft);
}

function setSaving(isSaving) {
    saveBtn.disabled = isSaving || !hasUnsavedChanges();
    saveBtn.querySelector(".label").textContent = isSaving
        ? root.dataset.saveSaving
        : root.dataset.saveLabel;
    saveBtn.querySelector(".spinner").classList.toggle("hidden", !isSaving);
}

function setModalOpen(isOpen) {
    modalEl.classList.toggle("hidden", !isOpen);
    modalEl.classList.toggle("is-open", isOpen);
    modalEl.setAttribute("aria-hidden", String(!isOpen));
    document.body.classList.toggle("theme-modal-open", isOpen);
}

function renderThemes() {
    if (!themes.length) {
        listEl.innerHTML = `<p class="admin-subtitle">${root.dataset.emptyLabel}</p>`;
        return;
    }

    listEl.innerHTML = themes.map((theme) => {
        const checked = theme.id === selectedTheme ? "checked" : "";
        const current = theme.id === currentTheme
            ? `<span class="theme-badge">${root.dataset.currentLabel}</span>`
            : "";
        const settingsCount = Array.isArray(theme.settings) ? theme.settings.length : 0;
        const settingsBadge = settingsCount
            ? `<button type="button" class="theme-badge theme-badge-secondary theme-settings-trigger" data-theme-settings="${escapeHtml(theme.id)}">${settingsCount} ${escapeHtml(root.dataset.settingsCountLabel)}</button>`
            : "";
        const version = theme.version
            ? `<div class="theme-version">${root.dataset.versionLabel}: ${escapeHtml(theme.version)}</div>`
            : "";
        const author = theme.author
            ? theme.authorUrl
                ? `<a class="theme-author-link" href="${escapeHtml(theme.authorUrl)}" target="_blank" rel="noopener noreferrer">made by ${escapeHtml(theme.author)}</a>`
                : `<span class="theme-author-text">made by ${escapeHtml(theme.author)}</span>`
            : "";

        return `
            <label class="theme-card">
                <input type="radio" name="theme" value="${escapeHtml(theme.id)}" ${checked}>
                <div class="theme-card-body">
                    <div class="theme-card-top">
                        <div class="theme-card-badge-row">
                                ${current}
                                ${settingsBadge}
                        </div>
                        <div class="theme-card-heading">
                            <h3>${escapeHtml(theme.label)}</h3>
                        </div>
                    </div>
                    <p>${escapeHtml(theme.description || "")}</p>
                    ${version}
                    <div title="#${escapeHtml(theme.id)}" class="theme-id">#${escapeHtml(theme.id)}</div>
                    <div class="theme-card-footer">
                        <div class="theme-card-author">
                            ${author}
                        </div>
                    </div>
                </div>
            </label>
        `;
    }).join("");
}

function renderField(setting, value) {
    const fieldId = `theme-setting-${setting.id}`;
    const description = setting.description
        ? `<p class="theme-setting-description">${escapeHtml(setting.description)}</p>`
        : "";

    if (setting.type === "boolean") {
        return `
            <label class="theme-setting theme-setting-toggle" for="${fieldId}">
                <span class="theme-setting-toggle-header">
                    <input id="${fieldId}" type="checkbox" data-setting-id="${escapeHtml(setting.id)}" ${value ? "checked" : ""}>
                    <span class="theme-setting-choice-control" aria-hidden="true"></span>
                    <span class="theme-setting-title">${escapeHtml(setting.label)}</span>
                </span>
                ${description}
            </label>
        `;
    }

    if (setting.type === "textarea") {
        return `
            <label class="theme-setting" for="${fieldId}">
                <span class="theme-setting-title">${escapeHtml(setting.label)}</span>
                ${description}
                <textarea id="${fieldId}" data-setting-id="${escapeHtml(setting.id)}" rows="4">${escapeHtml(value)}</textarea>
            </label>
        `;
    }

    if (setting.type === "select") {
        const options = (setting.options || []).map((option) => `
            <option value="${escapeHtml(option.value)}" ${option.value === String(value) ? "selected" : ""}>${escapeHtml(option.label)}</option>
        `).join("");

        return `
            <label class="theme-setting" for="${fieldId}">
                <span class="theme-setting-title">${escapeHtml(setting.label)}</span>
                ${description}
                <select id="${fieldId}" data-setting-id="${escapeHtml(setting.id)}">
                    ${options}
                </select>
            </label>
        `;
    }

    if (setting.type === "radio") {
        const options = (setting.options || []).map((option) => `
            <label class="theme-setting-choice theme-setting-choice-chip">
                <input
                    type="radio"
                    name="${escapeHtml(fieldId)}"
                    value="${escapeHtml(option.value)}"
                    data-setting-id="${escapeHtml(setting.id)}"
                    ${option.value === String(value) ? "checked" : ""}>
                <span class="theme-setting-choice-chip-surface">
                    <span class="theme-setting-choice-label">${escapeHtml(option.label)}</span>
                </span>
            </label>
        `).join("");

        return `
            <fieldset class="theme-setting theme-setting-options">
                <legend class="theme-setting-title">${escapeHtml(setting.label)}</legend>
                ${description}
                <div class="theme-setting-choice-group">${options}</div>
            </fieldset>
        `;
    }

    if (setting.type === "range") {
        return `
            <label class="theme-setting" for="${fieldId}">
                <span class="theme-setting-title">${escapeHtml(setting.label)}</span>
                ${description}
                <div class="theme-setting-range-row">
                    <input id="${fieldId}" type="range" data-setting-id="${escapeHtml(setting.id)}" value="${escapeHtml(value)}">
                    <output data-range-output="${escapeHtml(setting.id)}">${escapeHtml(value)}</output>
                </div>
            </label>
        `;
    }

    const inputType = setting.type === "color"
        ? "color"
        : setting.type === "number"
            ? "number"
            : "text";

    return `
        <label class="theme-setting" for="${fieldId}">
            <span class="theme-setting-title">${escapeHtml(setting.label)}</span>
            ${description}
            <input id="${fieldId}" type="${inputType}" data-setting-id="${escapeHtml(setting.id)}" value="${escapeHtml(value)}">
        </label>
    `;
}

function groupSettings(settings) {
    const groups = [];
    const seen = new Map();

    for (const setting of settings) {
        const groupName = setting.group || "General";
        if (!seen.has(groupName)) {
            const bucket = { name: groupName, settings: [] };
            seen.set(groupName, bucket);
            groups.push(bucket);
        }

        seen.get(groupName).settings.push(setting);
    }

    return groups;
}

function renderSettings(themeId) {
    const theme = getThemeById(themeId);
    const settings = theme?.settings || [];
    const values = getDraftSettings(themeId);

    modalTheme = themeId;
    configTitleEl.textContent = `${root.dataset.configTitle}: ${theme?.label || themeId}`;
    configDescriptionEl.textContent = theme?.description || root.dataset.configNoDescription || "";
    resetBtn.disabled = !settings.length;

    if (!settings.length) {
        configFormEl.innerHTML = "";
        configEmptyEl.textContent = `${theme?.label || themeId}: ${root.dataset.configEmpty}`;
        configEmptyEl.classList.remove("hidden");
        setSaving(false);
        return;
    }

    configEmptyEl.classList.add("hidden");
    configFormEl.innerHTML = groupSettings(settings).map((group) => `
        <section class="theme-setting-group">
            <h3 class="theme-setting-group-title">${escapeHtml(group.name)}</h3>
            <div class="theme-setting-group-grid">
                ${group.settings.map((setting) => renderField(setting, values[setting.id])).join("")}
            </div>
        </section>
    `).join("");
    setSaving(false);
}

async function loadThemes() {
    setStatus(root.dataset.loading);
    const response = await adminFetch("/admin/api/themes");
    if (!response.ok) {
        throw new Error("load_failed");
    }

    const data = await response.json();
    themes = data.themes || [];
    themeSettings = data.themeSettings || {};
    currentTheme = data.currentTheme || currentTheme;
    selectedTheme = currentTheme;
    modalTheme = currentTheme;
    drafts = {};
    renderThemes();
    setStatus("");
    setSaving(false);
}

function updateDraft(themeId, settingId, value) {
    drafts[themeId] = {
        ...getDraftSettings(themeId),
        [settingId]: value
    };
    setSaving(false);
}

function openSettingsModal(themeId) {
    renderSettings(themeId);
    setModalOpen(true);
}

function closeSettingsModal() {
    setModalOpen(false);
}

listEl.addEventListener("change", (event) => {
    if (event.target.name !== "theme") return;
    selectedTheme = event.target.value;
    renderThemes();
    setStatus("");
    setSaving(false);
});

listEl.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-theme-settings]");
    if (!trigger) return;

    event.preventDefault();
    event.stopPropagation();

    const themeId = trigger.dataset.themeSettings;
    if (!themeId) return;

    selectedTheme = themeId;
    renderThemes();
    openSettingsModal(themeId);
    setStatus("");
});

configFormEl.addEventListener("input", (event) => {
    const settingId = event.target.dataset.settingId;
    if (!settingId) return;

    const theme = getThemeById(modalTheme);
    const setting = (theme?.settings || []).find((item) => item.id === settingId);
    if (!setting) return;

    const value = setting.type === "boolean"
        ? event.target.checked
        : event.target.value;

    updateDraft(modalTheme, settingId, value);

    if (setting.type === "range") {
        const output = configFormEl.querySelector(`[data-range-output="${settingId}"]`);
        if (output) {
            output.textContent = String(value);
        }
    }
});

configFormEl.addEventListener("change", (event) => {
    const settingId = event.target.dataset.settingId;
    if (!settingId) return;

    const theme = getThemeById(modalTheme);
    const setting = (theme?.settings || []).find((item) => item.id === settingId);
    if (!setting) return;

    const value = setting.type === "boolean"
        ? event.target.checked
        : event.target.value;

    updateDraft(modalTheme, settingId, value);
});

resetBtn.addEventListener("click", () => {
    const theme = getThemeById(modalTheme);
    drafts[modalTheme] = getDefaultSettings(theme);
    renderSettings(modalTheme);
    setStatus("");
});

modalCloseBtn.addEventListener("click", closeSettingsModal);

modalEl.addEventListener("click", (event) => {
    if (event.target.hasAttribute("data-modal-close")) {
        closeSettingsModal();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modalEl.classList.contains("is-open")) {
        closeSettingsModal();
    }
});

saveBtn.addEventListener("click", async () => {
    try {
        setSaving(true);
        setStatus("");

        const response = await adminFetch("/admin/api/theme", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                theme: selectedTheme,
                settings: getDraftSettings(selectedTheme)
            })
        });

        if (!response.ok) {
            throw new Error("save_failed");
        }

        const data = await response.json();
        currentTheme = data.theme || selectedTheme;
        themeSettings[currentTheme] = data.settings || {};
        delete drafts[currentTheme];
        selectedTheme = currentTheme;
        renderThemes();
        if (modalEl.classList.contains("is-open")) {
            renderSettings(modalTheme);
        }
        setStatus(root.dataset.saveSaved, "success");
    } catch {
        setStatus(root.dataset.saveError, "error");
    } finally {
        setSaving(false);
    }
});

loadThemes().catch(() => {
    setStatus(root.dataset.saveError, "error");
});
