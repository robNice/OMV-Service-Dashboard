# OMV Service Dashboard

---

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Admin Area](#admin-area)
  - [Access](#access)
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
  - [Installation: Standalone (advanced / untested)](#installation-standalone-advanced--untested)
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

The OMV Service Dashboard provides a central web interface for displaying and opening services and system information around an OpenMediaVault server.

It also works well as a permanently visible dashboard on wall displays or smart home screens.

---

## Features

- Clear dashboard with sections such as `System`, `Media`, or `Smart Home`
- Service cards with links to OMV, Home Assistant, Mealie, Jellyfin, and more
- Background images per section
- Preview images per section and service
- Live statistics drawer with uptime, RAM, disks, temperatures, and Docker containers
- Docker integration with container list, status, and update information
- Multilingual user interface
- Switchable frontend themes for the public dashboard

---

## Admin Area

The admin area is split into these sections:

### Access

The admin area is available here:

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
- `Info Drawer Refresh Interval`: refresh interval of the info drawer in seconds
- `Port`: port the application listens on
- `OMV RPC Path`: path to the `omv-rpc` binary

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

The technical details, folder structure, and inheritance behavior are documented in [`CONFIG_README.md`](./CONFIG_README.md).
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

1. If you want to prepare a custom configuration before first start, copy the example configuration:

```bash
cp -r config.example path-to-your-config-directory
```

You do not have to copy the config file, because it is created automatically on first start if it does not exist.

2. Map your config directory to `/config` in the compose file.

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

### Installation: Standalone (advanced / untested)

This mode is currently not actively tested and mainly exists for completeness.

#### Requirements

- Node.js v18+ or v20+
- npm
- OpenMediaVault host

#### Steps (overview)

1. Clone the repository.
2. Install dependencies.
3. Copy `config.example/` to `config/`.
4. Start the server with `node server.js`.

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
