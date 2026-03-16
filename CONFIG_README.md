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
  - [Themes (`/config/assets/themes`)](#themes-configassetsthemes)
    - [Theme directory structure](#theme-directory-structure)
    - [`meta.json`](#metajson)
    - [`theme.css`](#themecss)
    - [`drawer.css`](#drawercss)
    - [`theme.js` (optional)](#themejs-optional)
    - [Style inheritance](#style-inheritance)
    - [Overriding built-in themes](#overriding-built-in-themes)
- [Summary](#summary)

---

## Introduction

Whenever `/config` is mentioned here, it refers to your personal configuration directory for this application. It is either mounted in `docker-compose.yml` or defined via the `OMV_SERVICE_DASHBOARD_CONFIG` environment variable.

The `/config` directory contains optional user overrides for the OMV Service Dashboard.

Most changes can be managed conveniently through the application's admin area. This README is mainly relevant if you want to edit configuration files manually, add translations, or provide your own themes and assets.

To get started more easily, copy the `config.example` directory into your own `/config` directory and adjust it as needed.

All files in `/config` are read at runtime and override the integrated defaults where supported. Missing files automatically fall back to the internal defaults.

The `config.json` file is created on first start if it does not yet exist. The `services.json` file is created after the first save in the admin area.

This directory is intended for configuration, content, and supported frontend overrides such as themes. Arbitrary core application files should not be placed here.

---

## TL;DR for Docker users

If you run the OMV Service Dashboard via Docker, mount your personal configuration directory like this:

```yaml
services:
  omv-service-dashboard:
    image: omv-service-dashboard
    volumes:
      - /path/to/your/configuration-directory:/config
```

---

## Basic Notes

- `/config` is the only directory you should customize
- You can safely update or recreate the container at any time
- Your configuration, translations, images, and themes remain untouched
- If a file does not exist in `/config`, the integrated defaults are used automatically

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
  "title": "OMV Service Dashboard",
  "defaultLang": "en-GB",
  "theme": "classic",
  "infoDrawerRefreshInterval": 30,
  "port": 3000,
  "omvRpcPath": "/usr/sbin/omv-rpc",
  "admin": {
    "passwordHash": "3a33aaf60a0f71503b9c399e414e6ab8:e472941cd72ddc6807c2e5cb1291250ecec8664c5d9f1b9453196d410e900f7d",
    "passwordInitialized": true
  }
}
```

- `title`: Used as the base title and page heading
- `defaultLang`: Fallback language if no matching locale is found
- `theme`: Active public dashboard theme
- `infoDrawerRefreshInterval`: Info drawer refresh interval in seconds
- `port`: Port the application listens on
- `omvRpcPath`: Path to the `omv-rpc` binary
- `admin`: Admin password block; setting it to the default example resets the admin password to `dashboard`

If you forgot the admin password, you can delete the `admin` block from `config.json` and then restart the service. On the next start, the admin password will be set back to the default password `dashboard`.

### `services.json`

Defines the sections and services shown in the dashboard.

Since the admin area exists, manual editing of this file is usually no longer necessary.

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

#### Theme directory structure

The following directory structure applies when you want to create your own theme inside the user config directory.

```text
/config/assets/themes/<theme-id>/
├─ meta.json
├─ theme.css
├─ drawer.css
├─ theme.js
└─ assets/
```

`theme.js` and `assets/` are optional. `assets/` can contain theme-local fonts or images referenced by the theme CSS.

#### `meta.json`

Minimal example:

```json
{
  "id": "test",
  "label": "Test",
  "description": "Custom dashboard theme",
  "version": "1.0.0"
}
```

Rules:

- `id` must match the theme folder name
- the backend uses this file to list the theme
- if `meta.json` is missing or invalid, the theme is not offered in the backend

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
- `version`

Example:

```js
window.OMVTheme = {
  init({ body }) {
    if (document.getElementById('my-theme-root')) return;
    const el = document.createElement('div');
    el.id = 'my-theme-root';
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
