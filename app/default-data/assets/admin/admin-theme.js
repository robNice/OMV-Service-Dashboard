const root = document.getElementById("theme-settings");
const listEl = document.getElementById("theme-list");
const saveBtn = document.getElementById("theme-save");
const statusEl = document.getElementById("theme-status");

let currentTheme = root.dataset.currentTheme || "classic";
let selectedTheme = currentTheme;
let themes = [];

function setStatus(message, tone = "") {
    statusEl.textContent = message || "";
    statusEl.className = tone ? `hint ${tone}` : "hint";
}

function setSaving(isSaving) {
    saveBtn.disabled = isSaving || selectedTheme === currentTheme;
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

    listEl.innerHTML = themes.map(theme => {
        const checked = theme.id === selectedTheme ? "checked" : "";
        const current = theme.id === currentTheme
            ? `<span class="theme-badge">${root.dataset.currentLabel}</span>`
            : "";
        const version = theme.version
            ? `<div class="theme-version">${root.dataset.versionLabel}: ${theme.version}</div>`
            : "";

        return `
            <label class="theme-card">
                <input type="radio" name="theme" value="${theme.id}" ${checked}>
                <div class="theme-card-body">
                    <div class="theme-card-top">
                        <div class="theme-card-badge-row">
                            ${current}
                        </div>
                        <div class="theme-card-heading">
                            <h3>${theme.label}</h3>
                            <div class="theme-id">${theme.id}</div>
                        </div>
                    </div>
                    <p>${theme.description || ""}</p>
                    ${version}
                </div>
            </label>
        `;
    }).join("");

    saveBtn.disabled = selectedTheme === currentTheme;
}

async function loadThemes() {
    setStatus(root.dataset.loading);
    const response = await fetch("/admin/api/themes");
    if (!response.ok) {
        throw new Error("load_failed");
    }

    const data = await response.json();
    themes = data.themes || [];
    currentTheme = data.currentTheme || currentTheme;
    selectedTheme = currentTheme;
    renderThemes();
    setStatus("");
}

listEl.addEventListener("change", event => {
    if (event.target.name !== "theme") return;
    selectedTheme = event.target.value;
    saveBtn.disabled = selectedTheme === currentTheme;
    setStatus("");
});

saveBtn.addEventListener("click", async () => {
    if (selectedTheme === currentTheme) return;

    try {
        setSaving(true);
        setStatus("");

        const response = await fetch("/admin/api/theme", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ theme: selectedTheme })
        });

        if (!response.ok) {
            throw new Error("save_failed");
        }

        const data = await response.json();
        currentTheme = data.theme || selectedTheme;
        selectedTheme = currentTheme;
        renderThemes();
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
