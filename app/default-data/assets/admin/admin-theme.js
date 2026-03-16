const root = document.getElementById("theme-settings");
const listEl = document.getElementById("theme-list");
const saveBtn = document.getElementById("theme-save");
const resetBtn = document.getElementById("theme-reset");
const statusEl = document.getElementById("theme-status");
const configTitleEl = document.getElementById("theme-config-title");
const configDescriptionEl = document.getElementById("theme-config-description");
const configEmptyEl = document.getElementById("theme-config-empty");
const configFormEl = document.getElementById("theme-config-form");

let currentTheme = root.dataset.currentTheme || "classic";
let selectedTheme = currentTheme;
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
    statusEl.className = tone ? `hint ${tone}` : "hint";
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
    resetBtn.disabled = isSaving || !(getThemeById(selectedTheme)?.settings || []).length;
    saveBtn.querySelector(".label").textContent = isSaving
        ? root.dataset.saveSaving
        : root.dataset.saveLabel;
    saveBtn.querySelector(".spinner").classList.toggle("hidden", !isSaving);
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
            ? `<span class="theme-badge theme-badge-secondary">${settingsCount} ${escapeHtml(root.dataset.settingsCountLabel)}</span>`
            : "";
        const version = theme.version
            ? `<div class="theme-version">${root.dataset.versionLabel}: ${escapeHtml(theme.version)}</div>`
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
                            <div class="theme-id">#${escapeHtml(theme.id)}</div>
                        </div>
                    </div>
                    <p>${escapeHtml(theme.description || "")}</p>
                    ${version}
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
                <span class="theme-setting-title">${escapeHtml(setting.label)}</span>
                ${description}
                <input id="${fieldId}" type="checkbox" data-setting-id="${escapeHtml(setting.id)}" ${value ? "checked" : ""}>
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
            <label class="theme-setting-choice">
                <input
                    type="radio"
                    name="${escapeHtml(fieldId)}"
                    value="${escapeHtml(option.value)}"
                    data-setting-id="${escapeHtml(setting.id)}"
                    ${option.value === String(value) ? "checked" : ""}>
                <span>${escapeHtml(option.label)}</span>
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

function renderSettings() {
    const theme = getThemeById(selectedTheme);
    const settings = theme?.settings || [];
    const values = getDraftSettings(selectedTheme);

    configTitleEl.textContent = `${root.dataset.configTitle}: ${theme?.label || selectedTheme}`;
    configDescriptionEl.textContent = theme?.description || root.dataset.configNoDescription || "";

    if (!settings.length) {
        configFormEl.innerHTML = "";
        configEmptyEl.textContent = `${theme?.label || selectedTheme}: ${root.dataset.configEmpty}`;
        configEmptyEl.classList.remove("hidden");
        resetBtn.classList.add("hidden");
        setSaving(false);
        return;
    }

    configEmptyEl.classList.add("hidden");
    resetBtn.classList.remove("hidden");
    configFormEl.innerHTML = settings.map((setting) => renderField(setting, values[setting.id])).join("");
    setSaving(false);
}

async function loadThemes() {
    setStatus(root.dataset.loading);
    const response = await fetch("/admin/api/themes");
    if (!response.ok) {
        throw new Error("load_failed");
    }

    const data = await response.json();
    themes = data.themes || [];
    themeSettings = data.themeSettings || {};
    currentTheme = data.currentTheme || currentTheme;
    selectedTheme = currentTheme;
    drafts = {};
    renderThemes();
    renderSettings();
    setStatus("");
}

function updateDraft(settingId, value) {
    drafts[selectedTheme] = {
        ...getDraftSettings(selectedTheme),
        [settingId]: value
    };
    setSaving(false);
}

listEl.addEventListener("change", (event) => {
    if (event.target.name !== "theme") return;
    selectedTheme = event.target.value;
    renderThemes();
    renderSettings();
    setStatus("");
});

configFormEl.addEventListener("input", (event) => {
    const settingId = event.target.dataset.settingId;
    if (!settingId) return;

    const theme = getThemeById(selectedTheme);
    const setting = (theme?.settings || []).find((item) => item.id === settingId);
    if (!setting) return;

    const value = setting.type === "boolean"
        ? event.target.checked
        : event.target.value;

    updateDraft(settingId, value);

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

    const theme = getThemeById(selectedTheme);
    const setting = (theme?.settings || []).find((item) => item.id === settingId);
    if (!setting) return;

    const value = setting.type === "boolean"
        ? event.target.checked
        : event.target.value;

    updateDraft(settingId, value);
});

resetBtn.addEventListener("click", () => {
    const theme = getThemeById(selectedTheme);
    drafts[selectedTheme] = getDefaultSettings(theme);
    renderSettings();
    setStatus("");
});

saveBtn.addEventListener("click", async () => {
    try {
        setSaving(true);
        setStatus("");

        const response = await fetch("/admin/api/theme", {
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
        renderSettings();
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
