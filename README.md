# OMV Landing Page

A small Node.js–based landing page for an OpenMediaVault (OMV) host.  
It shows your main services as cards, grouped into sections, and can display live system statistics
(uptime, disk usage, temperatures, Docker containers, …).

The app is designed to run either:

- directly on the OMV host (“standalone”), or
- inside a Docker container with access to the host’s stats and Docker daemon.

---

## Features

- Clean dashboard with sections (e.g. *System*, *Media*, *Smart Home*, …)
- Service cards linking to OMV, Home Assistant, Mealie, Jellyfin, etc.
- Per-section background images
- Per-section and per-service thumbnails
- Live stats drawer (uptime, RAM, disks, temperatures, Docker containers)
- Docker integration (list containers, basic status, update info)
- Multilingual UI (labels, drawer texts, etc.)

---

## Configuration (important)

Configuration, translations and custom images are **not edited inside the application code**.

Instead, all user customization lives in a dedicated `/config` directory which is
read at runtime and safely survives updates and container rebuilds.

➡️ **Please read [`CONFIG_README.md`](./CONFIG_README.md) for details.**

This main README intentionally keeps configuration details short to avoid duplication.

---

## Directory Layout (relevant parts)

```text
app/
  server.js           # Node/Express server
  lib/                # Backend helpers (i18n, assets, stats, config loaders)
  templates/          # HTML templates

data/
  assets/             # Built-in assets (JS, CSS, images)
  i18n/               # Built-in translations
```

User-provided configuration and assets live outside the app code in:

```text
/config               # user configuration (mounted volume)
```

---

## Installation: Docker (recommended)

### Requirements

- Docker
- Docker Compose (or `docker compose`)

### Quick start

```yaml
services:
  landingpage:
    container_name: omv-landingpage
    build:
      context: .
      dockerfile: Dockerfile
    image: omv-landingpage-with-docker
    pid: "host"
    privileged: true
    devices:
      - "/dev:/dev"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /var/lib/dpkg:/host/var/lib/dpkg:ro  # dpkg-Status vom Host
      - /:/hostroot:ro,rslave
      - /your-config-directory:/config
    environment:
      PROC_ROOT: /host/proc
      SYS_ROOT: /host/sys
      HOST_ROOT: /hostroot
      DPKG_ROOT: /host/var/lib/dpkg
    working_dir: /app
    command: ["node", "server.js"]
    ports:
      - "3000:3000"  # mapping the desired port to the configured port inside the container
    restart: unless-stopped

```

1. Copy the example configuration:

   ```bash
   cp -r config.example path-to-your-config-directory
   ```

   Dont't forget to map the config directory to the config volume in the Docker Compose file.


2. Start the container:

   ```bash
   docker compose up -d
   ```

3. Open the landing page:

   ```
   http://<host>:chosenport/
   ```

You can update or recreate the container at any time –  
everything inside `/config` is preserved.

---

## Installation: Standalone (advanced / untested)

> ⚠️ This mode is currently not actively tested and mainly provided for completeness.

### Requirements

- Node.js (v18+ or v20+ recommended)
- npm
- OpenMediaVault host

### Steps (high level)

1. Clone the repository
2. Install dependencies
3. Copy `config.example/` to `config/`
4. Start the server via `node server.js`

---

## Notes

- The `/config` directory seems optional; missing files fall back to built-in defaults.
  BUT: You should at least define your own services.json
- JavaScript and CSS are part of the application core and are **not customizable**.
- Visual customization is limited to backgrounds and card images.
- Translations from `/config/i18n` are merged on top of built-in translations.

---

## License

MIT (or your preferred license)
