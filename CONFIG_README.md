# Configuration (`/config`)

---

## Table of Contents

- [Introduction](#introduction)
- [TL;DR for Docker users](#tldr-for-docker-users)
- [Basic Notes](#basic-notes)
- [Directory Structure](#directory-structure)
- [Configuration Files](#configuration-files)
  - [`config.json`](#configjson)
  - [`services.json`](#servicesjson)
  - [`i18n-settings.json`](#i18n-settingsjson)
  - [Translations (`/config/i18n`)](#translations-configi18n)
    - [How translations work](#how-translations-work)
    - [Example: `i18n/fr-FR.json`](#example-i18nfr-frjson)
  - [Image overrides (`/config/assets`)](#image-overrides-configassets)
  - [Themes (`/config/assets/themes`)](#themes-configassetsthemes)
    - [Theme directory structure](#theme-directory-structure)
    - [`meta.json`](#metajson)
      - [Theme settings schema](#theme-settings-schema)
      - [Supported field types](#supported-field-types)
      - [`text`](#text)
      - [`textarea`](#textarea)
      - [`number`](#number)
      - [`range`](#range)
      - [`color`](#color)
      - [`select`](#select)
      - [`radio`](#radio)
      - [`boolean`](#boolean)
    - [Theme i18n (`i18n/`)](#theme-i18n-i18n)
      - [File naming](#file-naming)
      - [Structure](#structure)
      - [Wiring up in `meta.json`](#wiring-up-in-metajson)
      - [How translated strings relate to CSS and JS](#how-translated-strings-relate-to-css-and-js)
    - [`theme.css`](#themecss)
    - [`drawer.css`](#drawercss)
    - [`theme.js` (optional)](#themejs-optional)
    - [Style inheritance](#style-inheritance)
    - [Overriding built-in themes](#overriding-built-in-themes)
- [Summary](#summary)

---

## Introduction

Whenever `/config` is mentioned here, it refers to the user config directory of the NAS Portal.

All persistent changes made in the admin area are written there.

In Docker, this directory is usually mounted to `/config` inside the container.

In standalone mode, it should usually be passed explicitly via `--config-dir`. `OMV_SERVICE_DASHBOARD_CONFIG` is only the fallback if no CLI parameter is provided.

Most changes can be managed conveniently through the application's admin area. This README is mainly relevant if you want to edit configuration files manually, add translations, or provide your own themes and assets.

To get started more easily, copy the `config.example` directory into your own `/config` directory and adjust it as needed.

All files in `/config` are read at runtime and override the integrated defaults where supported. Missing files automatically fall back to the internal defaults.

The `config.json` file is created on first start if it does not yet exist. The `services.json` file is created after the first save in the admin area. Uploaded section backgrounds, section cards, and service cards are also stored in this directory.

This directory is intended for configuration, content, and supported frontend overrides such as themes. Arbitrary core application files should not be placed here.

---

## TL;DR for Docker users

If you run the NAS Portal via Docker, mount your personal configuration directory like this:

```yaml
services:
  omv-service-dashboard:
    image: omv-service-dashboard
    volumes:
      - /path/to/your/configuration-directory:/config
```

All persistent admin changes are written to that mounted directory.

You normally do not need to set `OMV_SERVICE_DASHBOARD_CONFIG` in Docker, because `/config` is already the default config path inside the container.

---

## Basic Notes

- `/config` is the only directory you should customize
- You can safely update or recreate the container at any time
- Your configuration, translations, images, and themes remain untouched
- If a file does not exist in `/config`, the integrated defaults are used automatically
- Section backgrounds, section cards, and service cards can be overridden from `/config/assets`

You should never modify files inside the container.

---

## Directory Structure

```text
/config
├─ config.json
├─ services.json
├─ i18n-settings.json
├─ i18n/
│  └─ en-GB.json
└─ assets/
   ├─ backgrounds/
   ├─ cards/
   │  ├─ sections/
   │  └─ services/
   └─ themes/
      └─ <theme-id>/
         ├─ meta.json
         ├─ theme.css
         ├─ drawer.css
         └─ assets/
```

---

## Configuration Files

### `config.json`

General application configuration such as title, fallback language, backend settings, and the active public theme.

Example:

```json
{
  "title": "NAS Portal",
  "defaultLang": "en-gb",
  "theme": "classic",
  "themeSettings": {},
  "infoDrawerRefreshInterval": 30,
  "port": 3000
}
```

- `title`: Used as the base title and page heading
- `defaultLang`: Fallback language if no matching locale is found
- `theme`: Active public dashboard theme
- `themeSettings`: Stored values for theme-specific settings from the admin area
- `infoDrawerRefreshInterval`: Info drawer refresh interval in seconds
- `port`: Port the application listens on
- `admin`: Admin password block; it is added automatically after first start or after changing the password in the admin area

If you forgot the admin password, you can delete the `admin` block from `config.json` and then restart the service. On the next start, the admin password will be set back to the default password `dashboard`.

### `services.json`

Defines the sections and services shown in the dashboard.

Since the admin area exists, manual editing of this file is usually no longer necessary.

The file is written automatically when you save sections and services in the admin area.

### `i18n-settings.json`

Controls which languages are available and how locale fallbacks work.

Example:

```json
{
  "locales": ["en-GB", "de-DE", "fr-FR"],
  "fallbacks": {
    "en": "en-GB",
    "en-US": "en-GB",
    "de": "de-DE",
    "fr": "fr-FR"
  }
}
```

If this file is missing, the integrated defaults are used.

### Translations (`/config/i18n`)

Each file in `/config/i18n` represents one locale and must be named like this:

```text
<locale>.json
```

Example:

```text
/config/i18n/fr-FR.json
```

#### How translations work

- Translations from `/config/i18n` are applied on top of the integrated translations
- You only need to define the keys you want to override or extend
- Missing keys automatically fall back to the internal language files

#### Example: `i18n/fr-FR.json`

```json
{
  "label": {
    "back": "Retour",
    "close": "Fermer",
    "system": "Système",
    "docker": "Conteneurs Docker"
  },
  "errors": {
    "noDisksFound": "Aucun disque détecté"
  },
  "units": {
    "gigabyte": "Go"
  }
}
```

### Themes (`/config/assets/themes`)

The public dashboard theme can be switched in the backend and is stored in `config.json` via the `theme` key.

The backend discovers available themes from the application's built-in theme directories and from `/config/assets/themes/<theme-id>/meta.json`.

Themes from `/config` extend the built-in themes and may also override them when they use the same `id`.

### Image overrides (`/config/assets`)

The admin area can upload custom images into `/config/assets`. These files override the built-in defaults with the same logical target.

Relevant directories:

```text
/config/assets/backgrounds
/config/assets/cards/sections
/config/assets/cards/services
```

Typical examples:

- `/config/assets/backgrounds/_home.*` for the home background
- `/config/assets/cards/sections/media.*` for the section card of `media`
- `/config/assets/cards/services/jellyfin.*` for the service card of `jellyfin`

The exact file extension is not important to the frontend. The server resolves the matching image automatically.

#### Theme directory structure

The following directory structure applies when you want to create your own theme inside the user config directory.

```text
/config/assets/themes/<theme-id>/
├─ meta.json
├─ theme.css
├─ drawer.css
├─ theme.js
├─ assets/
└─ i18n/
   ├─ en-GB.json
   └─ de-DE.json
```

`theme.js`, `assets/`, and `i18n/` are optional. `assets/` can contain theme-local fonts or images referenced by the theme CSS.

#### `meta.json`

Minimal example:

```json
{
  "id": "test",
  "label": "Test",
  "description": "Custom dashboard theme",
  "author": "Jane Doe",
  "authorUrl": "https://example.com",
  "version": "1.0.0"
}
```

Rules:

- `id` must match the theme folder name
- the backend uses this file to list the theme
- `author` is optional and is shown in the admin theme card bottom right as `made by <name>`
- `authorUrl` is optional and makes the author name link to that URL in a new tab; only `http` and `https` URLs are supported
- if `meta.json` is missing or invalid, the theme is not offered in the backend

If you want to expose theme-specific options in the admin area, you can add a `settings` array to `meta.json`.

Extended example:

```json
{
  "id": "test",
  "label": "Test",
  "description": "Custom dashboard theme",
  "author": "Jane Doe",
  "authorUrl": "https://example.com",
  "version": "1.0.0",
  "settings": [
    {
      "id": "accent-color",
      "group": "Colors",
      "label": "Accent color",
      "description": "Used for buttons and highlights.",
      "type": "color",
      "default": "#60a5fa"
    }
  ]
}
```

##### Theme settings schema

Each entry in `settings` describes one configurable value for the selected theme.

Supported keys:

- `id`: Stable setting key. This is also used to generate CSS variables and `data-` attributes.
- `group`: Optional group label shown in the admin modal. Use it to organize larger setting collections such as `Drawer`, `Cards`, or `Status Chips`.
- `label`: Human-readable field label in the admin area.
- `description`: Optional help text shown below the label.
- `type`: Defines validation and the rendered form control.
- `default`: Default value used when the user has not saved an override yet.
- `options`: Required for `select` and `radio`. Each option needs `value` and `label`.

Behavior notes:

- settings are defined by the theme in `meta.json`
- user-selected values are stored separately in `config.json`
- the backend validates values against the schema before sending them to the frontend
- frontend output uses a fixed `themesetting` prefix
- CSS variables look like `--themesetting-accent-color`
- HTML data attributes look like `data-themesetting-card-style="glass"`
- theme JavaScript receives validated values via `window.OMVTheme.init({ settings })`

Examples:

```css
body {
  --my-accent: var(--themesetting-accent-color, #60a5fa);
}

.service-status {
  background: var(--my-accent);
}

body[data-themesetting-card-style="glass"] .service {
  backdrop-filter: blur(12px);
}
```

```js
window.OMVTheme = {
  init({ settings, body }) {
    body?.style.setProperty('--my-accent-runtime', settings['accent-color'] || '#60a5fa');

    if (settings['card-style'] === 'glass') {
      body?.setAttribute('data-card-style-runtime', 'glass');
    }
  }
};
```

##### Supported field types

The following field types are supported by the backend and admin UI.

##### `text`

Use for short free-form strings.

Example:

```json
{
  "id": "headline-text",
  "group": "Header",
  "label": "Headline text",
  "type": "text",
  "default": "Dashboard"
}
```

Typical use:

- short labels
- CSS class names or style tokens
- small text snippets

##### `textarea`

Use for multi-line text input.

Example:

```json
{
  "id": "welcome-copy",
  "group": "Header",
  "label": "Welcome copy",
  "type": "textarea",
  "default": "Welcome to the dashboard."
}
```

Typical use:

- longer text blocks
- notes
- theme-specific copy

##### `number`

Use for numeric values that are entered directly.

Example:

```json
{
  "id": "card-pixel-width",
  "group": "Pixelation",
  "label": "Card pixel width",
  "type": "number",
  "default": 40
}
```

Typical use:

- dimensions
- spacing values
- counts

##### `range`

Use for numeric values that should be adjusted with a slider.

Example:

```json
{
  "id": "overlay-opacity",
  "group": "Effects",
  "label": "Overlay opacity",
  "type": "range",
  "default": 60
}
```

Typical use:

- opacity
- intensity
- scale-like values

##### `color`

Use for color values. The admin area renders a color picker.

Example:

```json
{
  "id": "drawer-text-color",
  "group": "Drawer",
  "label": "Drawer text color",
  "type": "color",
  "default": "#d7e2ff"
}
```

Typical use:

- text colors
- background colors
- chip colors
- borders or highlights

##### `select`

Use for a compact dropdown with predefined options.

Example:

```json
{
  "id": "card-style",
  "group": "Cards",
  "label": "Card style",
  "type": "select",
  "default": "glass",
  "options": [
    { "value": "solid", "label": "Solid" },
    { "value": "glass", "label": "Glass" }
  ]
}
```

Typical use:

- mode switches with several options
- compact enumerations

##### `radio`

Use for a small set of mutually exclusive options that should stay immediately visible.

Example:

```json
{
  "id": "header-alignment",
  "group": "Header",
  "label": "Header alignment",
  "type": "radio",
  "default": "center",
  "options": [
    { "value": "left", "label": "Left" },
    { "value": "center", "label": "Center" },
    { "value": "right", "label": "Right" }
  ]
}
```

Typical use:

- layout variants
- alignment choices
- small option sets

##### `boolean`

Use for true/false values. The admin area renders a checkbox.

Example:

```json
{
  "id": "show-glow",
  "group": "Effects",
  "label": "Enable glow",
  "type": "boolean",
  "default": true
}
```

Typical use:

- toggles
- enable/disable flags
- optional effects

#### Theme i18n (`i18n/`)

Themes can provide translated labels and descriptions for all their admin-area strings. The translation files live in an `i18n/` subdirectory inside the theme folder.

##### File naming

Each file represents one locale and must be named `<locale>.json`:

```text
i18n/en-GB.json   ← required fallback
i18n/de-DE.json
i18n/fr-FR.json
…
```

**At least `en-GB.json` must be present.** The backend falls back to English when no file matches the user's locale.

##### Structure

The file has three top-level sections:

```json
{
  "meta": {
    "label": "Theme name shown in the admin list",
    "description": "One-line theme description shown in the admin card."
  },
  "groups": {
    "header": "Header",
    "layout": "Layout",
    "colors": "Colors"
  },
  "settings": {
    "accent-color": {
      "label": "Accent color",
      "description": "Color used for active indicators and highlights."
    }
  }
}
```

- `meta.label` / `meta.description` — translated theme name and description
- `groups.<group-id>` — translated group headings shown in the settings modal
- `settings.<setting-id>.label` / `.description` — translated label and help text for each setting

##### Wiring up in `meta.json`

To activate i18n for a setting, replace the inline `label`, `description`, and `group` fields with `labelKey`, `descriptionKey`, and `groupKey`. Each key is a dot-path into the i18n file:

```json
{
  "id": "my-theme",
  "labelKey": "meta.label",
  "descriptionKey": "meta.description",
  "settings": [
    {
      "id": "accent-color",
      "groupKey": "groups.colors",
      "labelKey": "settings.accent-color.label",
      "descriptionKey": "settings.accent-color.description",
      "type": "color",
      "default": "#60a5fa"
    }
  ]
}
```

If a key is missing from the active locale file, the backend falls back to `en-GB.json` automatically, then to the inline `label`/`description` field if still not found.

##### How translated strings relate to CSS and JS

The i18n strings only affect **labels and descriptions inside the admin area**. They do not change how settings are applied to the frontend.

Setting values are always exposed in the frontend as:

- CSS variables: `--themesetting-<setting-id>` (e.g. `--themesetting-accent-color`)
- HTML data attributes on `<body>`: `data-themesetting-<setting-id>` (e.g. `data-themesetting-card-style`)
- JavaScript: `settings['<setting-id>']` inside `window.OMVTheme.init({ settings })`

These are derived from setting **IDs and values**, not from the translated labels.

```css
/* Use the setting value via CSS variable — language-independent */
body {
  --my-accent: var(--themesetting-accent-color, #60a5fa);
}
```

```js
window.OMVTheme = {
  init({ settings }) {
    /* Setting value is always the same regardless of the user's language */
    const color = settings['accent-color'] || '#60a5fa';
    document.documentElement.style.setProperty('--my-accent', color);
  }
};
```

---

#### `theme.css`

This file contains the main public dashboard styling for the selected theme.

It is loaded only for the active theme.

Typical targets are:

- `.page-header`
- `.section-nav`
- `.service`
- `.service-title`

#### `drawer.css`

This file contains theme-specific styling for the info drawer.

It is also loaded only for the active theme.

Typical targets are:

- `#info-drawer .panel`
- `#info-drawer .tab`
- `#info-drawer .section h3`
- `#info-drawer .kv`

#### `theme.js` (optional)

Themes may also provide an optional client-side script at:

```text
/config/assets/themes/<theme-id>/theme.js
```

If that file exists for the active theme, the frontend loads it automatically after the shared frontend scripts.

Convention:

- register a single global object at `window.OMVTheme`
- provide `init(context)` as the theme entry point
- optionally provide `destroy()` for cleanup
- keep theme-specific DOM and behavior in this file instead of editing shared core scripts

The `context` object currently contains:

- `theme`
- `body`
- `document`
- `drawer`
- `settings`
- `version`

Example:

```js
window.OMVTheme = {
  init({ body, settings }) {
    if (document.getElementById('my-theme-root')) return;
    const el = document.createElement('div');
    el.id = 'my-theme-root';
    el.textContent = settings['accent-color'] || 'theme active';
    body.appendChild(el);
  },
  destroy() {
    document.getElementById('my-theme-root')?.remove();
  }
};
```

A complete example showing both CSS overrides and a small `theme.js` implementation is available at [`config.example/assets/themes/sunrise`](./config.example/assets/themes/sunrise/).

#### Style inheritance

Theme CSS does not replace the whole frontend. It extends the shared base styles.

Load order for the public page:

1. Shared base styles such as `style.css`, `bg.css`, `drawer.css`, and `drawer-icons.css`
2. The selected theme's `theme.css`
3. The selected theme's `drawer.css`
4. The selected theme's `theme.js` if present

That means:

- base layout and shared behavior still come from the built-in styles
- the selected theme overrides only what it needs
- your custom theme CSS should use normal selectors like `.page-header` or `#info-drawer .panel`
- wrapping selectors like `body[data-theme="..."]` are not required in custom themes
- theme-specific JavaScript should use the `window.OMVTheme.init(context)` convention

#### Overriding built-in themes

If you create a directory under `/config/assets/themes/<theme-id>/` using an existing theme ID and provide a matching `meta.json`, that theme is used in the backend and during asset resolution instead of the built-in version.

This lets you adjust or fully replace a built-in theme without editing files in the app directory.

Files with the same name such as `theme.css`, `drawer.css`, `theme.js`, and theme-local assets from `/config` take precedence over the built-in variant.

---

## Summary

- `/config` is optional
- Missing files always fall back to integrated defaults
- Translation files are merged
- Images and other assets under `/config/assets` override the matching visual assets
- Themes are composed from built-in assets and `/config/assets/themes`, can override built-in variants, and may optionally extend behavior via `theme.js`
