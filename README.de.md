# OMV Service Dashboard

---

## Inhalt

- [Einfuehrung](#einfuehrung)
- [Funktionen](#funktionen)
- [Konfiguration](#konfiguration)
- [Admin-Bereich](#admin-bereich)
- [Theming](#theming)
- [Verzeichnisstruktur (relevante Teile)](#verzeichnisstruktur-relevante-teile)
- [Installation](#installation)
  - [Installation: Docker (empfohlen)](#installation-docker-empfohlen)
    - [Voraussetzungen](#voraussetzungen)
    - [Schnellstart](#schnellstart)
  - [Installation: Standalone (fortgeschritten / ungetestet)](#installation-standalone-fortgeschritten--ungetestet)
    - [Voraussetzungen](#voraussetzungen-1)
    - [Schritte (Uebersicht)](#schritte-uebersicht)
- [Hinweise](#hinweise)
- [Screenshots](#screenshots)
  - [Mobile Dashboard-Uebersicht](#mobile-dashboard-uebersicht)
  - [Mobile Dashboard-Sektion](#mobile-dashboard-sektion)
  - [Mobile Info-Drawer](#mobile-info-drawer)
  - [Desktop Dashboard-Uebersicht](#desktop-dashboard-uebersicht)
  - [Desktop Dashboard-Sektion](#desktop-dashboard-sektion)
  - [Desktop Info-Drawer](#desktop-info-drawer)
  - [Theme 1984](#theme-1984)
  - [Theme Bubbles](#theme-bubbles)
  - [Theme Classic](#theme-classic)
  - [Theme Compact List](#theme-compact-list)
  - [Theme Console](#theme-console)
  - [Theme Hacker](#theme-hacker)
  - [Theme Hippies](#theme-hippies)
  - [Theme Waaaah-Waaah-Waaaaaah](#theme-waaaah-waaah-waaaaaah)
- [Lizenz](#lizenz)
- [Hinweise zu Drittanbieter-Komponenten](#hinweise-zu-drittanbieter-komponenten)

---

## Einfuehrung

Das OMV Service Dashboard dient in erster Linie als zentrale, uebersichtliche Weboberflaeche zur Anzeige und zum Aufruf von Diensten und Systeminformationen rund um einen OpenMediaVault-Server.

Darueber hinaus eignet sich das Dashboard sehr gut als dauerhaft sichtbares Interface auf Bildschirmen, wie es im Smart-Home-Umfeld haeufig eingesetzt wird.

---

## Funktionen

- Uebersichtliches Dashboard mit Sektionen wie `System`, `Media` oder `Smart Home`
- Service-Karten mit Links zu OMV, Home Assistant, Mealie, Jellyfin und mehr
- Hintergrundbilder pro Sektion
- Vorschaubilder pro Sektion und Service
- Live-Statistik-Drawer mit Uptime, RAM, Datentraegern, Temperaturen und Docker-Containern
- Docker-Integration mit Containerliste, Status und Update-Informationen
- Mehrsprachige Benutzeroberflaeche
- Umschaltbare Frontend-Themes fuer das oeffentliche Dashboard

---

## Konfiguration

Seitenstruktur, Konfiguration, Uebersetzungen und benutzerdefinierte Bilder werden ueber den Admin-Bereich und Konfigurationsdateien festgelegt.

Die Konfigurationsdateien liegen in einem eigenen `/config`-Verzeichnis. Dieses wird zur Laufzeit eingelesen und uebersteht Updates sowie Container-Neubauten sicher.

Bitte lies [`CONFIG_README.de.md`](./CONFIG_README.de.md) fuer die vollstaendige Konfigurationsreferenz.

---

## Admin-Bereich

Sektionen, Services und das aktive oeffentliche Theme koennen im integrierten Admin-Bereich verwaltet werden:

```text
{dashboard-url}/admin
```

Das Standard-Passwort ist:

```text
dashboard
```

Die `services.json` muss in der Regel nicht mehr manuell bearbeitet werden. Aenderungen erfolgen ueber die Weboberflaeche und werden automatisch gespeichert.

Fuer einige eingebaute Sektionen-IDs existieren bereits Grafiken. Wenn du diese nutzen moechtest, verwende diese IDs:

- `admin`
- `files`
- `kitchen`
- `media`
- `network`
- `smart-home`

Default-Bilder fuer Sektionen und Services koennen hier abgelegt werden:

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

Fuer hochgeladene Card-Bilder ist eine Groesse von etwa `305px x 185px` empfehlenswert.

---

## Theming

Das oeffentliche Dashboard unterstuetzt umschaltbare Themes. Das aktive Theme wird in der `config.json` gespeichert und kann auch im Backend ausgewaehlt werden.

Beispiel:

```json
{
  "theme": "classic"
}
```

Eigene Themes koennen unter folgendem Pfad abgelegt werden:

```text
/config/assets/themes/<theme-id>/
```

Jedes Theme-Verzeichnis sollte mindestens diese Dateien enthalten:

```text
meta.json
theme.css
drawer.css
```

Themes koennen optional auch ein clientseitiges Skript mitbringen:

```text
theme.js
```

Wenn fuer das aktive Theme eine Datei unter `/assets/themes/<theme-id>/theme.js` existiert, wird sie vom Frontend automatisch geladen.

Konvention fuer Theme-Skripte:

- Genau ein globales Objekt unter `window.OMVTheme` registrieren
- Eine Funktion `init(context)` bereitstellen
- Optional eine Funktion `destroy()` fuer Cleanup bereitstellen
- Theme-spezifisches DOM und Verhalten im Theme-Ordner halten statt gemeinsame Core-Skripte zu veraendern

Der an `init()` uebergebene `context` enthaelt:

- `theme`
- `body`
- `document`
- `drawer`
- `version`

Die technischen Details, die Ordnerstruktur und das Verhalten der Style-Vererbung sind in [`CONFIG_README.de.md`](./CONFIG_README.de.md) dokumentiert.
Theme-Vorschauen findest du weiter unten ab [Theme 1984](#theme-1984).

---

## Verzeichnisstruktur (relevante Teile)

```text
app/
  server.js           # Node/Express-Server
  lib/                # Backend-Helfer (i18n, Assets, Stats, Config-Loader)
  templates/          # HTML-Templates
  default-data/       # wird zur Laufzeit nach /data kopiert
    assets/           # integrierte Assets (JS, CSS, Bilder)
    i18n/             # integrierte Uebersetzungen
config.example/       # Beispielkonfiguration
```

Benutzerdefinierte Konfigurationen und Assets liegen ausserhalb des App-Codes:

```text
/config               # Benutzerkonfiguration (gemountetes Volume)
```

---

## Installation

Die Anwendung ist dafuer ausgelegt, entweder:

- in einem Docker-Container (empfohlen)
- direkt auf dem OMV-Host (standalone)

### Installation: Docker (empfohlen)

#### Voraussetzungen

- Docker
- Docker Compose oder `docker compose`

#### Schnellstart

Siehe [`example.docker-compose.yml`](./example.docker-compose.yml).

1. Wenn du vor dem ersten Start bereits eine eigene Konfiguration vorbereiten moechtest, kopiere die Beispielkonfiguration:

```bash
cp -r config.example path-to-your-config-directory
```

Du musst die Konfigurationsdatei nicht zwingend kopieren, da sie beim ersten Start automatisch erstellt wird, falls sie noch nicht existiert.

2. Mappe dein Config-Verzeichnis im Compose-File nach `/config`.

3. Starte den Container:

```bash
docker compose up -d
```

4. Oeffne das Dashboard im Browser:

```text
http://<host>:<port>/
```

Updates und Neuaufsetzen des Containers sind jederzeit moeglich. Alles innerhalb von `/config` bleibt erhalten.

---

### Installation: Standalone (fortgeschritten / ungetestet)

Dieser Modus wird aktuell nicht aktiv getestet und ist hauptsaechlich der Vollstaendigkeit halber vorhanden.

#### Voraussetzungen

- Node.js v18+ oder v20+
- npm
- OpenMediaVault-Host

#### Schritte (Uebersicht)

1. Repository klonen.
2. Abhaengigkeiten installieren.
3. `config.example/` nach `config/` kopieren.
4. Server mit `node server.js` starten.

---

## Hinweise

- Das oeffentliche Dashboard kann ueber `/config/assets/themes` gethemed werden.
- Der Admin-Bereich behaelt bewusst sein eigenes Styling und wird nicht gethemed.
- Uebersetzungen aus `/config/i18n` werden ueber die integrierten Uebersetzungen gelegt.

---

## Screenshots

### Mobile Dashboard-Uebersicht

![Dashboard overview mobile](docs/screenshots/omvsd_overview_mobile.png)

### Mobile Dashboard-Sektion

![Dashboard section mobile](docs/screenshots/omvsd_section_mobile.png)

### Mobile Info-Drawer

![Dashboard info drawer mobile](docs/screenshots/omvsd_info_drawer_mobile.png)

### Desktop Dashboard-Uebersicht

![Dashboard overview desktop](docs/screenshots/omvsd_overview_desktop.png)

### Desktop Dashboard-Sektion

![Dashboard section desktop](docs/screenshots/omvsd_section_desktop.png)

### Desktop Info-Drawer

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

## Lizenz

[`MIT`](./LICENSE)

## Hinweise zu Drittanbieter-Komponenten

[`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)
