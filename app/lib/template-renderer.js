const fs = require("fs");
const path = require("path");

const {APP_DATA, CONFIG_DIR, APP_CODE} = require("./paths");
const {translateTextI18n} = require("./i18n-util");
const {getTheme, sanitizeThemeSettings} = require("./theme-registry");
const { _internals: { normalizeTag } } = require("./i18n-config");
const {
    resolveSectionCardImage,
    resolveServiceCardImage
} = require("./image-resolver");

function imageSrc(image) {
    if (!image?.src) return '';
    return image.v ? `${image.src}?v=${image.v}` : image.src;
}

function renderService(service) {
    const card = service.cardImage || resolveServiceCardImage(service);
    return `
    <div class="service">
      <a href="${service.url}" target="_blank">
      <img src="${imageSrc(card)}" alt="${service.title}" />
        <div class="service-title">${service.title}</div>
      </a>
    </div>`;
}

function renderSection(section) {
    return `
    <div class="service">
      <a href="/section/${encodeURIComponent(section.id)}">
        <img src="${imageSrc(section.cardImage)}" alt="${section.title}" />
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
      <img src="${imageSrc(section.cardImage)}" alt="${section.title}" />
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

function buildServiceGridTemplate(value) {
    const columns = Number(value);

    if (!Number.isFinite(columns) || columns <= 0) {
        return "repeat(auto-fit, minmax(min(100%, var(--omv-service-card-width, 300px)), 1fr))";
    }

    return `repeat(${Math.max(1, Math.floor(columns))}, minmax(0, 1fr))`;
}

function buildThemeSettingMarkup(themeId, config) {
    const settings = buildThemeSettings(themeId, config);
    const attrs = [];
    const cssVars = [
        `--omv-grid-template-desktop:${buildServiceGridTemplate(settings["cards-per-row-desktop"])}`,
        `--omv-grid-template-tablet:${buildServiceGridTemplate(settings["cards-per-row-tablet"])}`,
        `--omv-grid-template-mobile:${buildServiceGridTemplate(settings["cards-per-row-mobile"])}`
    ];

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
    initialStats = null,
    backgroundUrl = ""
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
            .replace(/{{BACKGROUND_URL}}/g, backgroundUrl)
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
</footer>
<script src="/assets/admin/admin-nav.js?v=${version}"></script>`;
}

function isAdminNavCurrent(pathname, target) {
    if (target === "/admin") {
        return pathname === "/admin" || pathname === "/admin/";
    }
    return pathname.startsWith(target);
}

function buildAdminNav(req) {
    const pathname = req.originalUrl || req.path || "";
    const links = [
        {
            href: "/admin/services",
            label: "{{__.admin.services.title}}",
            current: isAdminNavCurrent(pathname, "/admin/services"),
            icon: `
                        <svg viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="4" width="8" height="7" rx="1.5"></rect>
                            <rect x="13" y="4" width="8" height="7" rx="1.5"></rect>
                            <rect x="3" y="13" width="8" height="7" rx="1.5"></rect>
                            <rect x="13" y="13" width="8" height="7" rx="1.5"></rect>
                        </svg>`
        },
        {
            href: "/admin/theme",
            label: "{{__.admin.theme.title}}",
            current: isAdminNavCurrent(pathname, "/admin/theme"),
            icon: `
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M12 4.2C7.69 4.2 4.2 7.69 4.2 12C4.2 16.31 7.69 19.8 12 19.8C12.55 19.8 13 19.35 13 18.8C13 18.51 12.87 18.24 12.66 18.05C12.46 17.86 12.33 17.59 12.33 17.29C12.33 16.74 12.78 16.29 13.33 16.29H15.14C18.49 16.29 21.2 13.58 21.2 10.23C21.2 6.9 18.97 4.2 12 4.2Z"></path>
                            <circle cx="7.9" cy="11.2" r="1.1"></circle>
                            <circle cx="10.6" cy="8.2" r="1.1"></circle>
                            <circle cx="14.2" cy="8.7" r="1.1"></circle>
                            <circle cx="16.4" cy="12.1" r="1.1"></circle>
                        </svg>`
        },
        {
            href: "/admin/config",
            label: "{{__.admin.config.title}}",
            current: isAdminNavCurrent(pathname, "/admin/config"),
            icon: `
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M10.32 4.32L9.58 6.1C9.22 6.24 8.88 6.44 8.57 6.67L6.7 6.48L5.38 8.77L6.52 10.24C6.47 10.61 6.47 10.99 6.52 11.36L5.38 12.83L6.7 15.12L8.57 14.93C8.88 15.16 9.22 15.36 9.58 15.5L10.32 17.28H12.96L13.7 15.5C14.06 15.36 14.4 15.16 14.71 14.93L16.58 15.12L17.9 12.83L16.76 11.36C16.81 10.99 16.81 10.61 16.76 10.24L17.9 8.77L16.58 6.48L14.71 6.67C14.4 6.44 14.06 6.24 13.7 6.1L12.96 4.32H10.32Z"></path>
                            <circle cx="11.64" cy="10.8" r="2.35"></circle>
                        </svg>`
        },
        {
            href: "/admin/setpassword",
            label: "{{__.admin.password.title}}",
            current: isAdminNavCurrent(pathname, "/admin/setpassword"),
            icon: `
                        <svg viewBox="0 0 24 24" fill="none">
                            <rect x="5" y="11" width="14" height="10" rx="2"></rect>
                            <path d="M8 11V8C8 5.79 9.79 4 12 4C14.21 4 16 5.79 16 8V11"></path>
                            <circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none"></circle>
                        </svg>`
        }
    ];

    const navLinks = links.map(({href, label, current, icon}) => `
                <a href="${href}" class="admin-nav-link${current ? " admin-nav-link-current" : ""}">
                    <span class="admin-nav-icon" aria-hidden="true">${icon}
                    </span>
                    <span>${label}</span>
                </a>`).join("");

    return `
        <button class="admin-nav-toggle" type="button" aria-label="Admin menu" aria-expanded="false">
            <span></span>
            <span></span>
            <span></span>
        </button>
        <nav class="admin-nav" aria-label="Admin">
            <div class="admin-nav-group">${navLinks}
            </div>
            <div class="admin-nav-group admin-nav-group-end">
                <a href="/admin/logout" class="admin-nav-link admin-nav-link-logout">
                    <span class="admin-nav-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M10 5H6C4.9 5 4 5.9 4 7V17C4 18.1 4.9 19 6 19H10"></path>
                            <path d="M14 16L20 12L14 8"></path>
                            <path d="M20 12H9"></path>
                        </svg>
                    </span>
                    <span>{{__.admin.logout}}</span>
                </a>
            </div>
        </nav>`;
}

function renderAdminTemplate(req, template, {version, projectName, projectUrl}) {
    return translateTextI18n(
        template
            .replace(/{{ADMIN_NAV}}/g, buildAdminNav(req))
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
    return fs.readFileSync(path.join(APP_CODE, "templates/index.html"), "utf-8");
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
