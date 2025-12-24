# OMV Landing Page

A small Node.js–based landing page for an OpenMediaVault (OMV) host.  
It shows your main services as cards, grouped into sections, and can display live system statistics (uptime, disk usage, temperatures, Docker containers, …).



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
- Multilingual UI (labels, drawer texts, etc.), with configurable default language

---

## Directory Layout (relevant parts)

```text
app/
  server.js           # Node/Express server
  public/             # Static assets (JS, CSS, client-side code, icons, ...)
  views/              # HTML templates

data/
  config.json         # Global configuration (version, title, default language)
  services.json       # Definition of sections & services/cards
  i18n/
    en.json           # English UI texts
    de.json           # German UI texts
    fr.json           # French UI texts (if you create it)
  assets/
    backgrounds/      # Section background images (JPG, name = section.id)
    cards/
      sections/       # Section-card thumbnails   (JPG, name = section.id)
      services/       # Service-card thumbnails  (JPG, name = service.id)
```

---

## Background Images

**Location**

```text
data/assets/backgrounds
```

**Rules**

- File type: `jpg`
- File name: must match the `id` of the section:

  ```text
  data/assets/backgrounds/system.jpg      # for section.id = "system"
  data/assets/backgrounds/media.jpg       # for section.id = "media"
  data/assets/backgrounds/smart-home.jpg  # for section.id = "smart-home"
  ```

- If no image exists for a section, a fallback (solid color / gradient) is used.

---

## Thumbnails for Cards

There are two kinds of thumbnails:

1. **Section cards** (the big “entry” cards for *System*, *Media*, etc.)
2. **Service cards** (the tiles inside each section for *Home Assistant*, *Jellyfin*, …)

### Section card thumbnails

**Location**

```text
data/assets/cards/sections
```

**Rules**

- File type: `jpg`
- File name: must match `section.id`:

  ```text
  data/assets/cards/sections/system.jpg     # for section.id = "system"
  data/assets/cards/sections/media.jpg      # for section.id = "media"
  ```

### Service card thumbnails

**Location**

```text
data/assets/cards/services
```

**Rules**

- File type: `jpg`
- File name: must match `service.id`:

  ```text
  data/assets/cards/services/omv.jpg        # for service.id = "omv"
  data/assets/cards/services/homeassistant.jpg
  data/assets/cards/services/mealie.jpg
  ```

If a thumbnail is missing, the card falls back to an icon / color defined in the CSS or template.

---

## Internationalization (i18n)

The UI is multilingual. All labels (buttons, drawer labels, unit names, etc.) are provided by JSON language files and controlled via `config.json`.

### Language files

**Location**

```text
data/i18n
```

Each language has one JSON file with key–value pairs, for example `en.json`:

```json
{
  "label.back": "Back",
  "label.liveStats": "Live stats",
  "label.close": "Close",
  "label.info": "Info",
  "label.days": "days",
  "label.hours_short": "hrs",
  "label.storage": "Storage (HDDs)",
  "label.temps": "Temperatures",
  "label.versions": "Versions",
  "label.system": "System",
  "label.docker": "Docker containers",
  "docker.status.up": "Up",
  "docker.status.created": "Created"
}
```

**To add a new language:**

1. Copy an existing language file, e.g.:

   cp data/i18n/en.json data/i18n/fr.json

2. Translate all values, keep the keys as they are.
3. Make sure the language code matches what you put into `defaultLang` (see below),  
   for example: `en-gb`, `de-de`, `fr-fr`.

The front-end code (e.g. drawer-data.js) looks up texts by these keys and uses the active language.

### Language selection

Language resolution works like this:

1. The app checks the browser’s Accept-Language header and tries to find a matching language file in data/i18n (e.g. en-gb → en-gb.json).
2. If no exact match is found, it can fall back to a more generic file (e.g. en.json).
3. If nothing matches, it uses the fallback language defined in config.json via defaultLang.

So defaultLang in config.json is the final fallback and should correspond to an existing file in data/i18n (for example "defaultLang": "en-gb" requires data/i18n/en-gb.json).

---

## config.json (global configuration)

Location

data/config.json

Current minimal structure (example):

```json
{
  "version": "1.0.0-1",
  "title": "Heimnetz",
  "defaultLang": "en-gb"
}
```

### Fields

- version (string)  
  Version of the landing page configuration or app. It is mostly informational and can be shown in the UI or logs.

- title (string)  
  Title shown in the header / browser title (e.g. “Heimnetz”, “Home Lab”, “cube”).

- defaultLang (string)  
  Language code used as fallback if no suitable browser language match is found.  
  Must correspond to a file in data/i18n, for example:
    - "defaultLang": "en-gb" → data/i18n/en-gb.json
    - "defaultLang": "de-de" → data/i18n/de-de.json

Additional configuration options can be added in the future (e.g. more UI settings, feature flags).  
Treat config.json as the single place to configure global behavior and default language.

---

## services.json (sections & cards)

Location

> data/services.json 

(create your own services.json, see example.services.json in that same directory)

This file defines:

- the sections (e.g. System, Media, Smart Home),
- and the services (e.g. OMV, Home Assistant, Mealie, Jellyfin).

General structure (with two sections. 
First section containing two services, second section containing one service):

```json
{
  "sections": [
    {
      "id": "media",
      "title": "Media",
      "thumbnail": "media.png",
      "services": [
        {
          "title": "Jellyfin Media",
          "url": "https://jellyfin.mylocal.domain",
          "logo": "jellyfin.png"
        },
        {
          "title": "Lyron Music Server",
          "url": "https://lyron.mylocal.domain",
          "logo": "lms.png"
        }
      ]
    },
    {
      "id": "network",
      "title": "Network",
      "thumbnail": "network.png",
      "services": [
        {
          "title": "Router",
          "url": "https://router.mylocal.domain",
          "logo": "router.png"
        }
      ]
    }
  ]
}
```

### Sections

Each section object:

- id (string, required)  
  Unique identifier of the section.  
  Used for:
    - linking services to this section (service.section),
    - selecting a background image (data/assets/backgrounds/<id>.jpg),

- title (string, required)  
  Text shown in the UI for the section.  
  (You can either keep this literal or move it into the i18n JSON as a key later. Use this syntax to translate strings:)
  - > {{__.translate.key}} 

- thumbnail
  filename (without path) of the cards image (in data/assets/cards/sections)

- services: an array containing all services that should be displayed under this section

### Services

Each service object:

- title (string, required)  
  Card title shown in the UI.

- url (string, required)  
  The link opened when the user clicks the card.

- logo
  filename (without path) of the cards image (in data/assets/cards/services)

---

## (potential) Installation: Standalone

** NOTE: I NEVER TESTED THIS. ONLY EVER USED IT IN A DOCKER ENVIRONMENT. FEEL FREE TO POST YOUR EXPERIENCES :P

### Requirements

- Node.js (v18+ or v20+ recommended)
- npm
- OMV host (as disk informations is gathered by a file OMV provides)

### Steps

1. Clone the repository

   git clone <your-repo-url> omv-landingpage
   cd omv-landingpage

2. Install dependencies

   cd app
   npm install

3. Create configuration

   In the project root, make sure you have:

    - data/config.json (see section above)
    - data/services.json (see dummy example above)

   Adjust them to match your environment.

4. Add images (optional but recommended)

    - Put section backgrounds into data/assets/backgrounds/<section.id>.jpg
    - Put section card thumbnails into data/assets/cards/sections/<section.id>.jpg
    - Put service card thumbnails into data/assets/cards/services/<service.id>.jpg

5. Start the server

   From the app directory:

   node server.js

   *or, if you have a start script:*

   npm start

6. Access the landing page

   Open in your browser:

   http://<host>:3000/

   Adjust the port in /app/server.js    

7. (Optional) Run as a systemd service

    - Create a systemd unit that runs node /path/to/app/server.js as a service user.
    - Enable and start the service for automatic startup.

---

## Installation: Docker Container

### Requirements

- Docker
- Docker Compose (or docker compose)

### Steps

1. Prepare configuration and assets

   On the host, in your checkout directory:

    - Edit data/config.json
    - Edit data/services.json
    - Put backgrounds and thumbnails into data/assets/... as described above.

2. Build and start the container

   docker compose up -d --build

   First build can take some time, depending on your machine.

3. Check status

   docker compose ps

4. Open the landing page

   http://{HOST}:8069/

5. Rebuilding after code changes

    - If you change only config.json, services.json or images in data/,  
      a rebuild is usually not required, because ./data is mounted as a volume.
    - If you change application code or the Dockerfile, rebuild:

      docker compose down
      docker compose up -d --build
