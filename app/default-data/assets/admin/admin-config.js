const root = document.getElementById("config-settings");
const saveBtn = document.getElementById("config-save");
const statusEl = document.getElementById("config-status");
const labelEl = saveBtn.querySelector(".label");
const spinnerEl = saveBtn.querySelector(".spinner");

const fields = {
    title: document.getElementById("config-title"),
    defaultLang: document.getElementById("config-default-lang"),
    infoDrawerRefreshInterval: document.getElementById("config-refresh-interval"),
    port: document.getElementById("config-port")
};

const TXT = {
    saveLabel: root.dataset.saveLabel,
    saveSaving: root.dataset.saveSaving,
    saveSaved: root.dataset.saveSaved,
    saveError: root.dataset.saveError,
    portConfirmTitle: root.dataset.portConfirmTitle,
    portConfirmBody: root.dataset.portConfirmBody
};

let initialConfig = null;
let availableLanguages = [];

function syncLanguageOptions(selectedValue = "") {
    const current = String(selectedValue || "").trim();
    const values = [...availableLanguages];

    if (current && !values.includes(current)) {
        values.push(current);
    }

    values.sort((a, b) => a.localeCompare(b));

    fields.defaultLang.innerHTML = "";
    for (const locale of values) {
        const option = document.createElement("option");
        option.value = locale;
        option.textContent = locale;
        fields.defaultLang.appendChild(option);
    }

    fields.defaultLang.value = current;
}

function normalizedFormValue() {
    return {
        title: fields.title.value.trim(),
        defaultLang: fields.defaultLang.value.trim(),
        infoDrawerRefreshInterval: Number.parseInt(fields.infoDrawerRefreshInterval.value, 10) || 0,
        port: Number.parseInt(fields.port.value, 10) || 0
    };
}

function configsEqual(a, b) {
    return a.title === b.title
        && a.defaultLang === b.defaultLang
        && a.infoDrawerRefreshInterval === b.infoDrawerRefreshInterval
        && a.port === b.port;
}

function setStatus(message, tone = "") {
    statusEl.textContent = message || "";
    statusEl.className = tone ? `save-status ${tone}` : "save-status";
    statusEl.dataset.tone = tone || "";
    statusEl.classList.toggle("is-visible", Boolean(message));
    statusEl.classList.remove("is-fading");
}

function isValid() {
    const data = normalizedFormValue();
    return Boolean(data.title)
        && Boolean(data.defaultLang)
        && Number.isFinite(data.infoDrawerRefreshInterval)
        && data.infoDrawerRefreshInterval > 0
        && Number.isFinite(data.port)
        && data.port >= 1
        && data.port <= 65535;
}

function syncSaveState(isSaving = false) {
    if (!initialConfig) {
        saveBtn.disabled = true;
        return;
    }

    saveBtn.disabled = isSaving || !isValid() || configsEqual(initialConfig, normalizedFormValue());
}

function setSaving(isSaving) {
    syncSaveState(isSaving);
    labelEl.textContent = isSaving ? TXT.saveSaving : TXT.saveLabel;
    spinnerEl.classList.toggle("hidden", !isSaving);
}

function applyConfig(config) {
    initialConfig = {
        title: String(config.title || ""),
        defaultLang: String(config.defaultLang || ""),
        infoDrawerRefreshInterval: Number(config.infoDrawerRefreshInterval) || 0,
        port: Number(config.port) || 0
    };

    fields.title.value = initialConfig.title;
    syncLanguageOptions(initialConfig.defaultLang);
    fields.infoDrawerRefreshInterval.value = String(initialConfig.infoDrawerRefreshInterval);
    fields.port.value = String(initialConfig.port);
    syncSaveState();
}

async function loadConfig() {
    setStatus("");
    const response = await adminFetch("/admin/api/config");
    if (!response.ok) {
        throw new Error("load_failed");
    }

    const data = await response.json();
    availableLanguages = Array.isArray(data.availableLanguages) ? data.availableLanguages.map(String) : [];
    applyConfig(data);
}

Object.values(fields).forEach((field) => {
    const onChange = () => {
        setStatus("");
        syncSaveState();
    };

    field.addEventListener("input", onChange);
    field.addEventListener("change", onChange);
});

saveBtn.addEventListener("click", async () => {
    if (!initialConfig || !isValid()) {
        return;
    }

    const nextConfig = normalizedFormValue();
    if (nextConfig.port !== initialConfig.port) {
        const confirmed = window.confirm(`${TXT.portConfirmTitle}\n\n${TXT.portConfirmBody}`);
        if (!confirmed) {
            return;
        }
    }

    try {
        setSaving(true);
        setStatus("");

        const response = await adminFetch("/admin/api/config", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(nextConfig)
        });

        if (!response.ok) {
            throw new Error("save_failed");
        }

        const data = await response.json();
        applyConfig(data.config || nextConfig);
        setStatus(TXT.saveSaved, "success");
    } catch {
        setStatus(TXT.saveError, "error");
    } finally {
        setSaving(false);
    }
});

loadConfig().catch(() => {
    setStatus(TXT.saveError, "error");
});
