# OMV Service Dashboard


## Inhalt

- [Einführung](#einführung)
- [Funktionen](#funktionen)
- [Konfiguration (wichtig)](#konfiguration-wichtig)
- [Verzeichnisstruktur (relevante Teile)](#verzeichnisstruktur-relevante-teile)
- [Installation: Docker (empfohlen)](#installation-docker-empfohlen)
    - [Voraussetzungen](#voraussetzungen)
    - [Schnellstart](#schnellstart)
- [Installation: Standalone (fortgeschritten / ungetestet)](#installation-standalone-fortgeschritten--ungetestet)
    - [Voraussetzungen](#voraussetzungen-1)
    - [Schritte (Übersicht)](#schritte-übersicht)
- [Hinweise](#hinweise)
- [Screenshots](#screenshots)
    - [Mobile Dashboard-Übersicht](#mobile-dashboard-übersicht)
    - [Mobile Dashboard-Sektion](#mobile-dashboard-sektion)
    - [Mobile Info-Drawer](#mobile-info-drawer)
    - [Desktop Dashboard-Übersicht](#desktop-dashboard-übersicht)
    - [Desktop Dashboard-Sektion](#desktop-dashboard-sektion)
    - [Desktop Info-Drawer](#desktop-info-drawer)
- [Lizenz](#lizenz)

---

## Einführung

Ein kleines Node.js-basiertes Service- und System-Dashboard für einen OpenMediaVault-(OMV)-Host.  
Es zeigt Hauptdienste* als Karten, gruppiert in Sektionen, und kann Live-Systemstatistiken anzeigen
(Uptime, Festplattennutzung, Temperaturen, Docker-Container, …).

*Hauptdienste müssen in `/config/services.json` definiert werden.

Die Anwendung ist dafür ausgelegt, entweder

- in einem Docker-Container (empfohlen) oder
- direkt auf dem OMV-Host („standalone“)

zu laufen.

---

## Funktionen

- Übersichtliches Dashboard mit Sektionen (z. B. *System*, *Media*, *Smart Home*, …)
- Service-Karten mit Links zu OMV, Home Assistant, Mealie, Jellyfin usw.
- Hintergrundbilder pro Sektion
- Vorschaubilder pro Sektion und Service
- Live-Statistik-Drawer (Uptime, RAM, Datenträger, Temperaturen, Docker-Container)
- Docker-Integration (Containerliste, Basisstatus, Update-Informationen)
- Mehrsprachige Benutzeroberfläche (Labels, Drawer-Texte, usw.)

---

## Konfiguration (wichtig)

Konfiguration, Übersetzungen und benutzerdefinierte Bilder werden **nicht im Anwendungscode** bearbeitet.

Stattdessen befinden sich alle benutzerspezifischen Anpassungen in einem dedizierten
`/config`-Verzeichnis, das zur Laufzeit eingelesen wird und Updates sowie Container-Neubauten
sicher übersteht.

➡️ **Bitte lies [`CONFIG_README.de.md`](./CONFIG_README.de.md) für Details.**

Diese README hält Konfigurationsdetails bewusst kurz, um Redundanzen zu vermeiden.

---

## Verzeichnisstruktur (relevante Teile)

```text
app/
  server.js           # Node/Express-Server
  lib/                # Backend-Helfer (i18n, Assets, Stats, Config-Loader)
  templates/          # HTML-Templates
  default-data/       # wird zur Laufzeit nach /data kopiert
    assets/           # Integrierte Assets (JS, CSS, Bilder)
    i18n/             # Integrierte Übersetzungen
config.example/       # Beispielkonfiguration
```

Benutzerdefinierte Konfigurationen und Assets liegen außerhalb des App-Codes in:

```text
/config               # Benutzerkonfiguration (gemountetes Volume)
```

---

## Installation: Docker (empfohlen)

### Voraussetzungen

- Docker
- Docker Compose (oder `docker compose`)

### Schnellstart

Siehe die Datei [`example.docker-compose.yml`](./example.docker-compose.yml).

1. Beispielkonfiguration kopieren:

```bash
cp -r config.example path-to-your-config-directory
```

Vergiss nicht, das Config-Verzeichnis im Docker-Compose-File auf das Config-Volume zu mappen.

2. Container starten:

```bash
docker compose up -d
```

3. Dashboard im Browser öffnen:

```
http://<host>:<port>/
```

Updates oder ein Neuaufsetzen des Containers sind jederzeit möglich –  
alles innerhalb von `/config` bleibt erhalten.

---

## Installation: Standalone (fortgeschritten / ungetestet)

> ⚠️ Dieser Modus wird aktuell nicht aktiv getestet und ist hauptsächlich der Vollständigkeit halber vorhanden.

### Voraussetzungen

- Node.js (v18+ oder v20+ empfohlen)
- npm
- OpenMediaVault-Host

### Schritte (Übersicht)

1. Repository klonen
2. Abhängigkeiten installieren
3. `config.example/` nach `config/` kopieren
4. Server mit `node server.js` starten

---

## Hinweise

- Das `/config`-Verzeichnis *scheint* optional zu sein; fehlende Dateien greifen auf integrierte Defaults zurück.  
  **ABER:** Du solltest mindestens eine eigene `services.json` definieren.
- JavaScript und CSS sind Teil des Anwendungskerns und **nicht anpassbar**.
- Visuelle Anpassungen beschränken sich auf Hintergründe und Kartenbilder.
- Übersetzungen aus `/config/i18n` werden über die integrierten Übersetzungen gelegt.

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

---

## Lizenz

[`MIT`](./LICENSE)
