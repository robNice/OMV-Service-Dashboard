const fs = require("fs");
const path = require("path");

const {APP_DATA, CONFIG_DIR} = require("./paths");
const {translateTextI18n} = require("./i18n-util");
const {getTheme, sanitizeThemeSettings} = require("./theme-registry");
const { _internals: { normalizeTag } } = require("./i18n-config");
const {
    resolveSectionCardImage,
    resolveServiceCardImage
} = require("./image-resolver");

function renderService(service) {
    const card = resolveServiceCardImage(service);
    return `
    <div class="service">
      <a href="${service.url}" target="_blank">
      <img src="${card.src}" alt="${service.title}" />
        <div class="service-title">${service.title}</div>
      </a>
    </div>`;
}

function renderSection(section) {
    return `
    <div class="service">
      <a href="/section/${encodeURIComponent(section.id)}">
        <img src="${section.cardImage.src}" alt="${section.title}" />
        <div class="service-title">${section.title}</div>
      </a>
    </div>`;
}

function renderSectionNavItem(section, isActive = false) {
    return `
    <a
      class="section-nav-item${isActive ? " active" : ""}"
      href="/section/${encodeURIComponent(section.id)}"
      title="${section.title}"
      aria-label="${section.title}"
    >
      <img src="${section.cardImage.src}" alt="${section.title}" />
    </a>`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function buildThemeSettings(themeId, config) {
    const theme = getTheme(themeId);
    return sanitizeThemeSettings(theme, config?.themeSettings?.[theme?.id]);
}

function buildThemeSettingMarkup(themeId, config) {
    const settings = buildThemeSettings(themeId, config);
    const attrs = [];
    const cssVars = [];

    for (const [id, value] of Object.entries(settings)) {
        const attrValue = typeof value === "boolean" ? String(value) : String(value);
        attrs.push(`data-themesetting-${id}="${escapeHtml(attrValue)}"`);
        cssVars.push(`--themesetting-${id}:${String(value)}`);
    }

    return {
        settings,
        bodyAttrs: attrs.join(" "),
        bodyStyle: cssVars.join("; "),
        serializedSettings: JSON.stringify(settings)
            .replace(/</g, "\\u003c")
            .replace(/>/g, "\\u003e")
            .replace(/&/g, "\\u0026")
    };
}

function serializeForInlineScript(value) {
    return JSON.stringify(value)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026");
}

function setTemplate(req, template, {
    backlink = "",
    version,
    title,
    cards,
    sectionNav = "",
    theme = "classic",
    config = {},
    initialStats = null
}) {
    const themeMarkup = buildThemeSettingMarkup(theme, config);

    return translateTextI18n(
        template
            .replace(/{{BACKLINK}}/g, backlink)
            .replace(/{{VERSION}}/g, version)
            .replace(/{{TITLE}}/g, title)
            .replace(/{{SECTION_NAME}}/g, title)
            .replace(/{{SECTION_NAV}}/g, sectionNav)
            .replace(/{{THEME}}/g, theme)
            .replace(/{{THEME_SETTINGS_BODY_ATTRS}}/g, themeMarkup.bodyAttrs)
            .replace(/{{THEME_SETTINGS_BODY_STYLE}}/g, themeMarkup.bodyStyle)
            .replace(/{{THEME_SETTINGS_JSON}}/g, themeMarkup.serializedSettings)
            .replace(/{{INITIAL_STATS_JSON}}/g, serializeForInlineScript(initialStats))
            .replace(/{{HAS_INITIAL_STATS}}/g, initialStats ? "true" : "false")
            .replace(/{{SECTIONS_SERVICES}}/g, cards),
        {locale: req.getLocale()}
    );
}

function buildAdminMetaFooter(projectName, projectUrl, version) {
    return `
<footer class="admin-meta-footer">
    <span class="admin-meta-item">${projectName}</span>
    <a class="admin-meta-item admin-meta-link" href="${projectUrl}" target="_blank" rel="noopener noreferrer">${projectUrl}</a>
    <span class="admin-meta-item">v${version}</span>
</footer>`;
}

function renderAdminTemplate(req, template, {version, projectName, projectUrl}) {
    return translateTextI18n(
        template
            .replace(/{{VERSION}}/g, version)
            .replace(/{{ADMIN_META_FOOTER}}/g, buildAdminMetaFooter(projectName, projectUrl, version)),
        {locale: req.getLocale()}
    );
}

function renderThemeAdminTemplate(req, template, theme, options) {
    return renderAdminTemplate(
        req,
        template.replace(/{{THEME_ID}}/g, theme),
        options
    );
}

function listAvailableAdminLocales() {
    const dirs = [
        path.join(APP_DATA, "i18n"),
        path.join(CONFIG_DIR, "i18n")
    ];
    const locales = new Set();

    for (const dir of dirs) {
        if (!fs.existsSync(dir)) continue;

        for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
            if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".json") {
                continue;
            }

            const locale = normalizeTag(path.basename(entry.name, ".json"));
            if (locale) {
                locales.add(locale);
            }
        }
    }

    return Array.from(locales).sort((a, b) => a.localeCompare(b));
}

function loadTemplate() {
    return fs.readFileSync("/app/templates/index.html", "utf-8");
}

module.exports = {
    renderService,
    renderSection,
    renderSectionNavItem,
    setTemplate,
    renderAdminTemplate,
    renderThemeAdminTemplate,
    listAvailableAdminLocales,
    loadTemplate
};
