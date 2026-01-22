# Configuration (`/config`)

--- 

## Table of Contents

- [Introduction](#introduction)
- [TL;DR – Docker users](#tldr--docker-users)
- [Basic notes](#basic-notes)
- [Directory structure](#directory-structure)
- [Configuration files](#configuration-files)
    - [`config.json`](#configjson)
    - [`services.json`](#servicesjson)
    - [`i18n-settings.json`](#i18n-settingsjson)
    - [Translations (`/config/i18n`)](#translations-configi18n)
        - [How translations work](#how-translations-work)
        - [Example: `i18n/fr-FR.json`](#example-i18nfr-frjson)
- [Summary](#summary)

---

## Introduction

Whenever this `/config` is mentioned, it refers to **your personal**
`/config` directory for this application, which is either mounted in your
`docker-compose.yml` or defined via the environment variable
`OMV_SERVICE_DASHBOARD_CONFIG`.

The `/config` directory contains **optional user overrides** for the
OMV Service Dashboard.

To make getting started easier, copy the `config-example` directory into your
`/config` directory and adjust it to your needs.

All files in this directory are **read at runtime** and
**override the integrated default values** shipped with the application.  
Nothing in `/config` is mandatory – if a file is missing, the application
automatically falls back to its internal defaults.

The `config.json` is created when the service starts if it does not yet exist.  
If the file is missing, you can copy it from the `config-example` directory into
your `/config` directory.  
The `services.json` is only created after saving for the first time in the admin area.

> ⚠️ This directory is intended exclusively for **configuration and content**.  
> **JavaScript, CSS, and other core application files must not be placed here.  
> They will not be read there anyway ;)**

---

## TL;DR – Docker users

If you run the OMV Service Dashboard via Docker, define your personal
configuration directory as follows:

```yaml
services:
  omv-service-dashboard:
    image: omv-service-dashboard
    volumes:
      - /path/to/your/configuration-directory:/config
```

---

## Basic notes

- `/config` is the **only directory** you should customize
- You can safely update or recreate the container at any time
- Your configurations, translations, and images remain untouched
- If a file does not exist in `/config`, the integrated default values are used automatically

You must **never** modify files inside the container.

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

General application configuration (e.g. title, default language).

If present, this file **completely replaces** the internal
default configuration.

Example `config.json`:
```json
{
  "title": "OMV Service Dashboard",
  "defaultLang": "en-GB",
  "infoDrawerRefreshInterval": 30,
  "port"      : 3000,
  "omvRpcPath": "/usr/sbin/omv-rpc",
  "admin": {
    "passwordHash": "3a33aaf60a0f71503b9c399e414e6ab8:e472941cd72ddc6807c2e5cb1291250ecec8664c5d9f1b9453196d410e900f7d",
    "passwordInitialized": true
  }
}
```

- title: Used as the base title tag and as the h1
- defaultLang: Used as the fallback language if no matching locale is found
- infoDrawerRefreshInterval: Defines how often the info drawer is refreshed (in seconds)
- port: Port the application listens on
- omvRpcPath: Path to the omv-rpc binary – required to read disk lists / SMART info
- admin: Set the admin block exactly as shown to reset the admin password to the default password `dashboard`

### `services.json`

Defines the sections and services shown in the dashboard.
Since the introduction of the admin area, manual editing of this file
is no longer required.

---

### `i18n-settings.json`

> ⚠️ Although you could theoretically use this file to override the integrated
> translation settings, this is not recommended.
>
> I strongly recommend **not** placing this file in your `/config` directory
> unless you have a very good reason.
> Otherwise, you might miss future translations.

Controls which languages are available and how language fallbacks work.
The language is determined by the browser language
(more precisely by the `Accept-Language` header sent by your browser)
and falls back to the default language if no matching locale is found.

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
  Maps language codes (from the `Accept-Language` header) to a fallback locale.

  Example: If you are French and your browser sends
  `Accept-Language: fr;(...)`, the fallback locale for `fr`
  is `fr-FR`.

  Without this mapping, the fallback value would be the one defined as
  `defaultLang` in your `config.json`.

If this file is missing, the integrated default values are used.

---

### Translations (`/config/i18n`)

Each file in `/config/i18n` represents **one locale** and must be named as follows:

```
<locale>.json
```

Example:

```
/config/i18n/fr-FR.json
```

Complete (and hopefully correct) translations are already included for the following
languages:

- English
- German
- French
- Spanish
- Italian
- Dutch
- Polish
- Portuguese
- Turkish
- Japanese

If you translate the application into another language or find errors in the
existing translations, please consider contributing your translations
to the project.

### How translations work

- Translations from `/config/i18n` are applied **on top of** the integrated translations
- You only need to define the keys you want to **override or extend**
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

## Summary

- `/config` is **optional**
- Missing files always fall back to integrated defaults
- Configuration files replace default values
- Translation files are **merged**
- Assets override visual content only
