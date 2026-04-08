# NAS Portal

---

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Admin Area](#admin-area)
  - [Manage Sections and Services](#manage-sections-and-services)
  - [Choose Theme](#choose-theme)
  - [Edit Configuration](#edit-configuration)
  - [Change Password](#change-password)
- [Manual Configuration](#manual-configuration)
- [Theming](#theming)
- [Directory Structure (relevant parts)](#directory-structure-relevant-parts)
- [Installation](#installation)
  - [Installation: Docker (recommended)](#installation-docker-recommended)
    - [Requirements](#requirements)
    - [Quick Start](#quick-start)
  - [Installation: Standalone](#installation-standalone)
    - [Requirements](#requirements-1)
    - [Steps (overview)](#steps-overview)
- [Notes](#notes)
- [Screenshots](#screenshots)
  - [Mobile dashboard overview](#mobile-dashboard-overview)
  - [Mobile dashboard section](#mobile-dashboard-section)
  - [Mobile info drawer](#mobile-info-drawer)
  - [Desktop dashboard overview](#desktop-dashboard-overview)
  - [Desktop dashboard section](#desktop-dashboard-section)
  - [Desktop info drawer](#desktop-info-drawer)
  - [Theme 1984](#theme-1984)
  - [Theme Bubbles](#theme-bubbles)
  - [Theme Classic](#theme-classic)
  - [Theme Compact List](#theme-compact-list)
  - [Theme Console](#theme-console)
  - [Theme Hacker](#theme-hacker)
  - [Theme Hippies](#theme-hippies)
  - [Theme Waaaah-Waaah-Waaaaaah](#theme-waaaah-waaah-waaaaaah)
- [License](#license)
- [Third-Party Notices](#third-party-notices)

---

## Introduction

You probably know the situation: you have successfully set up your NAS and expanded it with a range of additional services. At the same time, there may be other services elsewhere in your network that you can open and manage through their own web frontends, each configured with its own URL. This dashboard is intended to help you collect all of those services and list them in a structured, categorized way.

In addition, the integrated info drawer gives you a quick overview of the overall status of your OMV NAS.

This themeable dashboard is also well suited as a permanently visible interface on displays, as is often used in smart home environments.

This project was originally built for my [OpenMediaVault](https://www.openmediavault.org/)-based NAS, pulled its info drawer data from the central OMV API, and used the more cumbersome name "OMV-Service-Dashboard".
Today, the service no longer depends on the OMV API for system, storage, temperature, or platform information. Instead, it reads those details directly from system files and common host tools such as `lsblk`, `smartctl`, `dmidecode`, `docker`, and similar runtime probes. Because of that, the portal is no longer tied to OMV and can also run on other NAS or Linux platforms, as long as the required host tools are available.

> **Notes**
> 
> Throughout this document, categories are referred to as "sections" and the configured entries within them as "services".
> 
> All persistent changes made in the admin area are written to the user config directory.
> 
> In Docker, this directory is `/config` inside the container and should usually be backed by a host volume mount.
> 
> In standalone mode, you should usually pass the config directory explicitly via `--config-dir`. The environment variable `OMV_SERVICE_DASHBOARD_CONFIG` is only used as a fallback if no CLI parameter is provided.

---

## Features

- Clear dashboard with sections like for example `System`, `Media` or `Smart Home`
- Service cards with links to your configured network services
- Background images per section
- Live statistics drawer (info drawer) with uptime, RAM, disks, temperatures, and Docker containers
- Multilingual user interface
- Switchable frontend themes for the public dashboard

---

## Admin Area

The admin area is split into these sections:

 - Sections and services
 - Themes
 - Configuration
 - Change password

and is available here:

```text
{dashboard-url}/admin
```

The default password is:

```text
dashboard
```

---

### Manage Sections and Services

Here you can create, edit, sort, and delete sections and services. You can also manage names, links, descriptions, preview images, and backgrounds here.

Graphics for some built-in section IDs already exist. If you want to use them, use these IDs:

- `admin`
- `files`
- `kitchen`
- `media`
- `network`
- `smart-home`

Default images for sections and services can be placed here:

```text
/config
└─ assets/
   ├─ backgrounds/
   │  ├─ _default.png
   │  └─ _home.png
   └─ cards/
      ├─ sections/
      │  └─ _default.png
      └─ services/
         └─ _default.png
```

For uploaded card images, a size of roughly `305px x 185px` is recommended.

---

### Choose Theme

Here you can select the active public theme. The list includes both built-in themes and additional themes placed in the user config directory under `/config/assets/themes`.

---

### Edit Configuration

Here you can edit the most important configuration values, for example:

- `Title`: base title and page heading of the dashboard
- `Fallback Language`: default language if no matching locale is found
- `Service Links Open`: controls how service links are opened
- `Info Drawer Refresh Interval`: refresh interval of the info drawer in seconds
- `Port`: port the application listens on

---

### Change Password

Here you can change the admin password.

---

## Manual Configuration

Configuration data is stored in `/config/config.json` and `/config/services.json` and can also be edited manually if needed.

In normal use, changes are made via the admin area and persisted automatically. Direct file editing is mainly useful if the backend configuration has become inconsistent.

Please read [`CONFIG_README.md`](./CONFIG_README.md) for the full configuration reference.

---

## Theming

The public dashboard supports switchable themes. The active theme is stored in `config.json` and can also be selected in the backend.

Example:

```json
{
  "theme": "classic"
}
```

Custom themes can be added under:

```text
/config/assets/themes/<theme-id>/
```

A complete example theme with `meta.json`, `theme.css`, `drawer.css`, and `theme.js` is available under [`config.example/assets/themes/sunrise`](./config.example/assets/themes/sunrise/).

Each theme directory should contain at least:

```text
meta.json
theme.css
drawer.css
```

Themes may also provide an optional client-side script:

```text
theme.js
```

If `/assets/themes/<theme-id>/theme.js` exists for the active theme, the frontend loads it automatically.

Theme script convention:

- Register a single global object at `window.OMVTheme`
- Provide an `init(context)` function
- Optionally provide a `destroy()` function for cleanup
- Keep theme-specific DOM and behavior inside the theme directory instead of modifying shared core scripts

The `context` passed to `init()` contains:

- `theme`
- `body`
- `document`
- `drawer`
- `version`

Custom themes can also reuse an existing built-in theme ID and thereby override a system theme from `/config/assets/themes`.

The technical details, folder structure, style inheritance, and overriding built-in themes are documented in [`CONFIG_README.md`](./CONFIG_README.md).
Theme previews can be found starting at [Theme 1984](#theme-1984) below.

---

## Directory Structure (relevant parts)

```text
app/
  server.js           # Node/Express server
  lib/                # Backend helpers (i18n, assets, stats, config loader)
  templates/          # HTML templates
  default-data/       # copied to /data at runtime
    assets/           # integrated assets (JS, CSS, images)
    i18n/             # integrated translations
config.example/       # example configuration
```

Custom configuration and assets live outside the app code:

```text
/config               # user configuration (mounted volume)
```

---

## Installation

The application is designed to run either:

- in a Docker container (recommended)
- directly on the OMV host (standalone)

### Installation: Docker (recommended)

#### Requirements

- Docker
- Docker Compose or `docker compose`

#### Quick Start

See [`example.docker-compose.yml`](./example.docker-compose.yml).

The image can be found here: 

`ghcr.io/robnice/omv-service-dashboard:latest`


1. If you want to prepare a custom configuration before first start, copy the example configuration:

```bash
cp -r config.example path-to-your-config-directory
```

You do not have to copy the config file, because it is created automatically on first start if it does not exist.

2. Mount your host config directory to `/config` in the compose file.

All persistent admin changes are written there.

3. Start the container:

```bash
docker compose up -d
```

4. Open the dashboard in your browser:

```text
http://<host>:<port>/
```

Updates and rebuilds are safe at any time. Everything inside `/config` remains intact.

---

### Installation: Standalone

#### Requirements

- Node.js v18+ or v20+
- npm
- OpenMediaVault host

#### Steps

1. Clone the repository.
2. Install dependencies:

```bash
cd app
npm install
```

3. Prepare a config directory. You can either copy the example files or start with an empty directory:

```bash
cp -r ../config.example /path/to/nas-portal-config
```

4. Start the server from the `app/` directory and pass the config directory explicitly:

```bash
node server.js --config-dir /path/to/nas-portal-config
```

`--config-dir` is the preferred standalone setup.

#### Config directory priority

The application resolves the user config directory in this order:

1. `--config-dir /path/to/config`
2. environment variable `OMV_SERVICE_DASHBOARD_CONFIG=/path/to/config`
3. default path: `app/config`

If neither CLI parameter nor environment variable is provided, the server starts with the default path and logs a startup hint.

#### Notes for standalone mode

- Runtime data is stored in `app/data` by default.
- User configuration is stored in `app/config` by default.
- All persistent admin changes are written to the selected config directory.
- The environment variable `OMV_SERVICE_DASHBOARD_CONFIG` is mainly useful for scripted or environment-based standalone setups.

---

## Notes

- The public dashboard can be themed via `/config/assets/themes`.
- The admin area intentionally keeps its own styling and is not themed.
- Translations from `/config/i18n` override the integrated translations.

---

## Screenshots

### Mobile dashboard overview

![Dashboard overview mobile](docs/screenshots/omvsd_overview_mobile.png)

### Mobile dashboard section

![Dashboard section mobile](docs/screenshots/omvsd_section_mobile.png)

### Mobile info drawer

![Dashboard info drawer mobile](docs/screenshots/omvsd_info_drawer_mobile.png)

### Desktop dashboard overview

![Dashboard overview desktop](docs/screenshots/omvsd_overview_desktop.png)

### Desktop dashboard section

![Dashboard section desktop](docs/screenshots/omvsd_section_desktop.png)

### Desktop info drawer

![Dashboard info drawer desktop](docs/screenshots/omvsd_info_drawer_desktop.png)

### Theme 1984

![Theme 1984](docs/screenshots/1984.png)

### Theme Bubbles

![Theme Bubbles](docs/screenshots/bubbles.png)

### Theme Classic

![Theme Classic](docs/screenshots/classic.png)

### Theme Compact List

![Theme Compact List](docs/screenshots/compact-list.png)

### Theme Console

![Theme Console](docs/screenshots/console.png)

### Theme Hacker

![Theme Hacker](docs/screenshots/hacker.png)

### Theme Hippies

![Theme Hippies](docs/screenshots/hippies.png)

### Theme Waaaah-Waaah-Waaaaaah

![Theme Waaaah-Waaah-Waaaaaah](docs/screenshots/waaaah-waaah-waaaaaah.png)

---

## License

[`MIT`](./LICENSE)

## Third-Party Notices

[`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)
