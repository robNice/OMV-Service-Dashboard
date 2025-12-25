# Configuration (`/config`)

The `/config` directory contains **optional user overrides** for the OMV Landingpage.

All files in this directory are **read at runtime** and **override the built-in defaults** shipped with the application.  
Nothing in `/config` is required – if a file is missing, the application falls back to its internal defaults.

> ⚠️ This directory is meant for **configuration and content only**.  
> **JavaScript, CSS and other application core files must not be placed here. They won't be read in there anyway ;)**

---

## TL;DR – Docker users

If you are running the OMV Landingpage via Docker, this is all you need to know:

```yaml
services:
  omv-landingpage:
    image: omv-landingpage
    volumes:
      - ./config:/config
```

- `/config` is the **only directory you should customize**
- You can safely update or recreate the container at any time
- Your configuration, translations and images stay untouched
- If a file does not exist in `/config`, the built-in defaults are used automatically

You never need to modify files inside the container.

---

## Directory structure

```
/config
 ├─ config.json
 ├─ services.json
 ├─ i18n-settings.json
 ├─ i18n/
 │   └─ en-GB.json
 └─ assets/
     ├─ backgrounds/
     └─ cards/
         ├─ sections/
         └─ services/
```

---

## Configuration files

### `config.json`

General application configuration (e.g. title, language defaults).

If present, this file **fully replaces** the internal default configuration.

config.json example:
```json
{
  "title": "OMV Landingpage",
  "defaultLang": "en-gb",
  "omvurl"    : "https://omv.cube.box",
  "port"      : 3000,
  "omvRpcPath": "/usr/sbin/omv-rpc"
}
````

---

### `services.json`

Defines sections and services shown on the landing page.

This file **fully replaces** the internal default `services.json` (which is just an example configuration).
You should definately **customize this file** to match your needs.

The following Example defines two sections, on is filled with two services and the other one is empty:

```json
{
  "sections": [
    {
      "id": "admin",
      "title": "Administration",
      "services": [
        {
          "title": "OMV Webinterface",
          "url": "https://omv.my.local.domain",
          "logo": "omv.png"
        },
        {
          "title": "Filebrowser",
          "url": "http://filebrowser.my.local.domain",
          "logo": "filebrowser.png"
        }
      ]
    },
    {
      "id": "smart-home",
      "title": "Smart-Home",
      "services": [

      ]
    }
  ]
}
```

Section IDs must be unique. 
Section title is used as card-title.

#### Card-image filenames

Section IDs also must match the card-image-filenames.

`"id": "admin"`
=> So a 'admin.png' image should exist either in

`/data/assets/cards/sections/`

or

`/{your-config-directory}/assets/cards/sections/`

Each section also has an own background image. The filename of this image must also match the section id. 

Luckily there actually is an admin.png in the built-in assets :)

Here is a complete list of available section-card-image-filenames:

- admin.png
- kitchen.png
- media.png
- network.png
- smart-home.png

This also means you can already use sections with the corresponding ids (admin, kitchen, media, network, smart-home)

If you are in need of more sections, feel free to add missing images to your config/assets/cards/sections-directory. Just keep in mind: filename is always `{id}.png` 


Services are configured a little bit differently:

```json
{
  "title": "OMV Webinterface",
  "url": "https://omv.my.local.domain",
  "logo": "omv.png"
}
```
`title` is used as card-title, `url` is used as card-link and `logo` is used as card-image. They should be placed in `/{your-config-dir}/assets/cards/services/`

All card images should be around 305px x 185px.


---

### `i18n-settings.json`

Controls which languages are available and how language fallbacks behave.

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

- `locales`  
  List of enabled locales.

- `fallbacks`  
  Maps language codes to a fallback locale.

If this file is missing, the built-in defaults are used.

---

## Translations (`/config/i18n`)

Each file in `/config/i18n` represents **one locale** and must be named:

```
<locale>.json
```

Example:

```
/config/i18n/fr-FR.json
```

### How translations work

- Translations from `/config/i18n` are **merged on top of** the built-in translations
- You only need to define the keys you want to **override or add**
- Missing keys automatically fall back to the internal language files

### Example: `i18n/fr-FR.json`

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

---

## Custom assets (`/config/assets`)

This directory allows you to override **visual content assets** only.

### Allowed asset overrides

```
/config/assets/
 ├─ backgrounds/
 └─ cards/
     ├─ sections/
     └─ services/
```

### Rules

- If an asset exists in `/config/assets`, it **overrides** the built-in version
- If it does not exist, the application falls back to `/data/assets`
- Only **images** are supported here

### Not allowed

The following must **never** be placed in `/config/assets`:

- JavaScript files
- CSS files
- Fonts
- Application icons required for functionality

These files are part of the application core and are intentionally immutable.

---

## Summary

- `/config` is **optional**
- Missing files always fall back to built-in defaults
- Configuration files replace defaults
- Translation files **merge** with defaults
- Assets override visuals only
- Application logic and styling are **not customizable**
