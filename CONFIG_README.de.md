# Konfiguration (`/config`)

---

## Inhalt

- [Einfuehrung](#einfuehrung)
- [TL;DR fuer Docker-Nutzer](#tldr-fuer-docker-nutzer)
- [Grundlegende Hinweise](#grundlegende-hinweise)
- [Verzeichnisstruktur](#verzeichnisstruktur)
- [Konfigurationsdateien](#konfigurationsdateien)
  - [`config.json`](#configjson)
  - [`services.json`](#servicesjson)
  - [`i18n-settings.json`](#i18n-settingsjson)
  - [Uebersetzungen (`/config/i18n`)](#uebersetzungen-configi18n)
    - [Wie Uebersetzungen funktionieren](#wie-uebersetzungen-funktionieren)
    - [Beispiel: `i18n/fr-FR.json`](#beispiel-i18nfr-frjson)
  - [Themes (`/config/assets/themes`)](#themes-configassetsthemes)
    - [Theme-Verzeichnisstruktur](#theme-verzeichnisstruktur)
    - [`meta.json`](#metajson)
    - [`theme.css`](#themecss)
    - [`drawer.css`](#drawercss)
    - [Style-Vererbung](#style-vererbung)
- [Zusammenfassung](#zusammenfassung)

---

## Einfuehrung

Wann immer hier von `/config` die Rede ist, ist damit dein persoenliches Konfigurationsverzeichnis fuer diese Anwendung gemeint. Es wird entweder in `docker-compose.yml` gemountet oder ueber die Umgebungsvariable `OMV_SERVICE_DASHBOARD_CONFIG` definiert.

Das `/config`-Verzeichnis enthaelt optionale Benutzer-Overrides fuer das OMV Service Dashboard.

Um den Einstieg zu erleichtern, kannst du das Verzeichnis `config.example` in dein eigenes `/config`-Verzeichnis kopieren und dort anpassen.

Alle Dateien in `/config` werden zur Laufzeit eingelesen und ueberschreiben dort, wo es vorgesehen ist, die integrierten Standardwerte. Fehlende Dateien fallen automatisch auf die internen Defaults zurueck.

Die `config.json` wird beim ersten Start angelegt, falls sie noch nicht existiert. Die `services.json` entsteht nach dem ersten Speichern im Admin-Bereich.

Dieses Verzeichnis ist fuer Konfiguration, Inhalte und unterstuetzte Frontend-Overrides wie Themes gedacht. Beliebige Core-Dateien der Anwendung sollten hier nicht abgelegt werden.

---

## TL;DR fuer Docker-Nutzer

Wenn du das OMV Service Dashboard ueber Docker betreibst, mounte dein persoenliches Konfigurationsverzeichnis so:

```yaml
services:
  omv-service-dashboard:
    image: omv-service-dashboard
    volumes:
      - /pfad/zu/deinem/konfigurationsverzeichnis:/config
```

---

## Grundlegende Hinweise

- `/config` ist das einzige Verzeichnis, das du anpassen solltest
- Du kannst den Container jederzeit sicher aktualisieren oder neu erstellen
- Deine Konfiguration, Uebersetzungen, Bilder und Themes bleiben dabei erhalten
- Existiert eine Datei nicht in `/config`, werden automatisch die integrierten Standardwerte verwendet

Dateien innerhalb des Containers sollten nicht manuell veraendert werden.

---

## Verzeichnisstruktur

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

## Konfigurationsdateien

### `config.json`

Allgemeine Anwendungskonfiguration wie Titel, Fallback-Sprache, Backend-Einstellungen und das aktive oeffentliche Theme.

Beispiel:

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

- `title`: Wird als Basistitel und Seitenueberschrift verwendet
- `defaultLang`: Fallback-Sprache, falls keine passende Locale gefunden wird
- `theme`: Aktives Theme fuer das oeffentliche Dashboard
- `infoDrawerRefreshInterval`: Aktualisierungsintervall des Info-Drawers in Sekunden
- `port`: Port, auf dem die Anwendung lauscht
- `omvRpcPath`: Pfad zur `omv-rpc`-Binary
- `admin`: Admin-Passwortblock; wenn er wie im Beispiel gesetzt wird, wird das Admin-Passwort auf `dashboard` zurueckgesetzt

### `services.json`

Definiert die im Dashboard angezeigten Sektionen und Dienste.

Seit es den Admin-Bereich gibt, ist die manuelle Bearbeitung dieser Datei normalerweise nicht mehr notwendig.

### `i18n-settings.json`

Steuert, welche Sprachen verfuegbar sind und wie Locale-Fallbacks funktionieren.

Beispiel:

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

Fehlt diese Datei, werden die integrierten Standardwerte verwendet.

### Uebersetzungen (`/config/i18n`)

Jede Datei in `/config/i18n` repraesentiert genau eine Locale und muss so benannt sein:

```text
<locale>.json
```

Beispiel:

```text
/config/i18n/fr-FR.json
```

#### Wie Uebersetzungen funktionieren

- Uebersetzungen aus `/config/i18n` werden ueber die integrierten Uebersetzungen gelegt
- Du musst nur die Keys definieren, die du ueberschreiben oder ergaenzen moechtest
- Fehlende Keys fallen automatisch auf die internen Sprachdateien zurueck

#### Beispiel: `i18n/fr-FR.json`

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

Das Theme des oeffentlichen Dashboards kann im Backend umgeschaltet werden und wird ueber den Schluessel `theme` in der `config.json` gespeichert.

Das Backend liest verfuegbare Themes aus `/config/assets/themes/<theme-id>/meta.json` und bietet sie in der Theme-Auswahl an.

#### Theme-Verzeichnisstruktur

```text
/config/assets/themes/<theme-id>/
├─ meta.json
├─ theme.css
├─ drawer.css
└─ assets/
```

`assets/` ist optional und kann theme-lokale Fonts oder Bilder enthalten, die von der Theme-CSS referenziert werden.

#### `meta.json`

Minimales Beispiel:

```json
{
  "id": "test",
  "label": "Test",
  "description": "Eigenes Dashboard-Theme",
  "version": "1.0.0"
}
```

Regeln:

- `id` muss zum Theme-Ordnernamen passen
- das Backend nutzt diese Datei, um das Theme aufzulisten
- fehlt `meta.json` oder ist sie ungueltig, wird das Theme im Backend nicht angeboten

#### `theme.css`

Diese Datei enthaelt das Haupt-Styling fuer das oeffentliche Dashboard des ausgewaehlten Themes.

Sie wird nur fuer das aktive Theme geladen.

Typische Ziele sind:

- `.page-header`
- `.section-nav`
- `.service`
- `.service-title`

#### `drawer.css`

Diese Datei enthaelt das Theme-spezifische Styling fuer den Info-Drawer.

Sie wird ebenfalls nur fuer das aktive Theme geladen.

Typische Ziele sind:

- `#info-drawer .panel`
- `#info-drawer .tab`
- `#info-drawer .section h3`
- `#info-drawer .kv`

#### Style-Vererbung

Theme-CSS ersetzt nicht das komplette Frontend, sondern erweitert die gemeinsamen Basis-Styles.

Ladereihenfolge auf der oeffentlichen Seite:

1. Gemeinsame Basis-Styles wie `style.css`, `bg.css`, `drawer.css` und `drawer-icons.css`
2. `theme.css` des ausgewaehlten Themes
3. `drawer.css` des ausgewaehlten Themes

Das bedeutet:

- Basislayout und gemeinsames Verhalten kommen weiterhin aus den integrierten Styles
- das aktive Theme ueberschreibt nur die Teile, die es veraendern moechte
- eigene Themes sollten mit normalen Selektoren wie `.page-header` oder `#info-drawer .panel` arbeiten
- Klammer-Selektoren wie `body[data-theme="..."]` sind in eigenen Themes nicht erforderlich

---

## Zusammenfassung

- `/config` ist optional
- Fehlende Dateien fallen immer auf integrierte Defaults zurueck
- Uebersetzungsdateien werden gemerged
- Bilder und andere Assets unter `/config/assets` ueberschreiben die passenden visuellen Assets
- Themes werden ueber `meta.json` erkannt und ueber `theme.css` und `drawer.css` gestaltet
