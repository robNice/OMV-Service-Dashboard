# Configuration (`/config`)


Whenever this text mentions `/config` it means your very own `/config` directory for this app, mapped in your docker-composer.yml or defined in the env variable `OMV_SERVICE_DASHBOARD_CONFIG`.

The `/config` directory contains **optional user overrides** for the OMV Service Dashboard.

To make things easier, copy the directory `config-example` to  your `/config` directory and customize it to your needs.

All files in this directory are **read at runtime** and **override the built-in defaults** shipped with the application.  
Nothing in `/config` is required – if a file is missing, the application falls back to its internal defaults.

Anyway: without a customized services.json, you will only see an exmaple landing page with very dead links. 

> ⚠️ This directory is meant for **configuration and content only**.  
> **JavaScript, CSS and other application core files must not be placed here. They won't be read in there anyway ;)**

---

## TL;DR – Docker users

If you are running the OMV Service Dashboard via Docker, define your personal config directory like this:

```yaml
services:
  omv-service-dashboard:
    image: omv-service-dashboard
    volumes:
      - /wherever-your-boat-floats/config:/config
      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
```
---
## Basic notes
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
  "title": "OMV Service Dashboard",
  "defaultLang": "en-GB",
  "infoDrawerRefreshInterval": 30,
  "port"      : 3000,
  "omvRpcPath": "/usr/sbin/omv-rpc"
}
```

- title: Used as basic title-tag and h1
- defaultLang: Used as fallback language if no language is specified in the URL
- infoDrawerRefreshInterval: How often the info drawer should be refreshed (in seconds)
- port: Port the application listens on
- omvRpcPath: Path to the omv-rpc binary: this is needed to read the disk list / smart info


### `services.json`

Defines sections and services shown on the landing page.

This file **fully replaces** the internal default `services.json` (which is just an example configuration).
You should definately **customize this file** to match your needs.

The following example defines two sections, one is filled with two services and the other one is empty (which doesn't makes much sense, does it? Change that now!):

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
> ⚠️ Section IDs must be unique. Section and service titles are used for title tags, h1 and card-titles.
--- 
#### Section card image filenames

Section card image filenames must match the section IDs.

`"id": "admin"`
=> So a 'admin.png', 'admin.gif', 'admin.jpg' or 'admin.webp' image should exist in

`/{your-config-directory}/assets/cards/sections/`

if it doesn't exist in

`/data/assets/cards/sections/` 

If in neither directory, a default image is used.

---

#### Section background-image filenames

Each section also has its own background image. 
The filename of this image must also match the section id (with any of the following file extensions: png, gif, jpg, webp). 

The image should exist in

`/{your-config-directory}/assets/backgrounds/`

if it doesn't exist in

`/data/assets/backgrounds/`

If in neither directory, a default image is used.

---
#### Available section-ids
Here is a complete list of already available section-ids, each with their own card and background image:

- admin
- kitchen
- media
- network
- smart-home

If you are in need of more sections, feel free to add missing images to your config/assets/cards/sections-directory. Just keep in mind: filename is always `{id}.`+any extension of png, gif, jpg or webp. 

---
#### Services
Services are configured a little bit differently:
 
```json
{
  "title": "OMV Webinterface",
  "url": "https://omv.my.local.domain",
  "logo": "omv.png"
}
```

- `title` is used as card-title, 
- `url` is used as card link (what to open when clicking on the card)
- `logo` is used as card-image. They should be placed in `/{your-config-dir}/assets/cards/services/`

If logo is not defined, a default image is used.

> ⚠️ 
> 
> All card images should be around 305px x 185px.

---

#### Default images and overrides

The Home background image is `assets/backgrounds/_home.png`. Use your own home-background
image by placing a `_home` + any extension of png, gif, jpg or webp in your config/assets/backgrounds directory.

The default background image is `assets/backgrounds/_default.png`. Use your own default background image by placing a `_default` + any extension of png, gif, jpg or webp in your config/assets/backgrounds directory.


The default section and service card images are `assets/cards/sections/_default.png` and `assets/cards/services/_default.png`.
Use your own default images by placing a `_default` + any extension of png, gif, jpg or webp in your config/assets/cards/sections and config/assets/cards/services directories.`

---

### `i18n-settings.json`

Controls which languages should be available and how language fallbacks behave.
The language is determined by the browser's language settings (to be precise, what `Accept-Language` header your browser sends) and falls back to the default language if no match is found.

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
  Maps language codes (`Accept-Language` header) to a fallback locale.
  
  For example: If you are french and your browser sends 
  `Accept-Language: fr;(...)` the fallback locale for `fr` is `fr-FR`. 
  
  Without this mapping, the fallback would be what is defined in your config.json as `defaultLang`.

If this file is missing, the built-in defaults are used.

---

### Translations (`/config/i18n`)

Each file in `/config/i18n` represents **one locale** and must be named:

```
<locale>.json
```

Example:

```
/config/i18n/fr-FR.json
```

However: Full (and hopefully correct) translations are already provided for English, French and German.

If you translate the application into another language, please consider contributing your translations back to the project.

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

Like mentioned above, `/config/assets` allows you to override **visual content assets** only.

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
