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
    - [`theme.js` (optional)](#themejs-optional)
    - [Style-Vererbung](#style-vererbung)
    - [Eingebaute Themes ueberschreiben](#eingebaute-themes-ueberschreiben)
- [Zusammenfassung](#zusammenfassung)

---

## Einfuehrung

Wann immer hier von `/config` die Rede ist, ist damit dein persönliches Konfigurationsverzeichnis für diese Anwendung gemeint. Es wird entweder in `docker-compose.yml` gemountet oder über die Umgebungsvariable `OMV_SERVICE_DASHBOARD_CONFIG` definiert.

Das `/config`-Verzeichnis enthält optionale Benutzer-Overrides für das OMV Service Dashboard.

Die meisten Änderungen kannst du bequem über den Admin-Bereich der Anwendung vornehmen. Diese README ist vor allem dann relevant, wenn du Konfigurationen manuell bearbeiten, Übersetzungen ergänzen oder eigene Themes und Assets hinterlegen möchtest.

Um den Einstieg zu erleichtern, kannst du das Verzeichnis `config.example` in dein eigenes `/config`-Verzeichnis kopieren und dort anpassen.

Alle Dateien in `/config` werden zur Laufzeit eingelesen und überschreiben dort, wo es vorgesehen ist, die integrierten Standardwerte. Fehlende Dateien fallen automatisch auf die internen Defaults zurück.

Die `config.json` wird beim ersten Start angelegt, falls sie noch nicht existiert. Die `services.json` entsteht nach dem ersten Speichern im Admin-Bereich.

Dieses Verzeichnis ist für Konfiguration, Inhalte und unterstützte Frontend-Overrides wie Themes gedacht. Beliebige Core-Dateien der Anwendung sollten hier nicht abgelegt werden.

---

## TL;DR fuer Docker-Nutzer

Wenn du das OMV Service Dashboard über Docker betreibst, mounte dein persönliches Konfigurationsverzeichnis so:

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
- Deine Konfiguration, Übersetzungen, Bilder und Themes bleiben dabei erhalten
- Existiert eine Datei nicht in `/config`, werden automatisch die integrierten Standardwerte verwendet

Dateien innerhalb des Containers sollten nicht manuell verändert werden.

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
         ├─ theme.js
         └─ assets/
```

---

## Konfigurationsdateien

### `config.json`

Allgemeine Anwendungskonfiguration wie Titel, Fallback-Sprache, Backend-Einstellungen und das aktive öffentliche Theme.

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

- `title`: Wird als Basistitel und Seitenüberschrift verwendet
- `defaultLang`: Fallback-Sprache, falls keine passende Locale gefunden wird
- `theme`: Aktives Theme für das öffentliche Dashboard
- `infoDrawerRefreshInterval`: Aktualisierungsintervall des Info-Drawers in Sekunden
- `port`: Port, auf dem die Anwendung lauscht
- `omvRpcPath`: Pfad zur `omv-rpc`-Binary
- `admin`: Admin-Passwortblock; wenn er wie im Beispiel gesetzt wird, wird das Admin-Passwort auf `dashboard` zurückgesetzt

Wenn du das Admin-Passwort vergessen hast, kannst du den `admin`-Block in der `config.json` löschen und den Dienst anschließend neu starten. Beim nächsten Start wird das Admin-Passwort dann erneut auf das Default-Passwort `dashboard` gesetzt.

---

### `services.json`

Definiert die im Dashboard angezeigten Sektionen und Dienste.

Seit es den Admin-Bereich gibt, ist die manuelle Bearbeitung dieser Datei normalerweise nicht mehr notwendig.

---

### `i18n-settings.json`

Steuert, welche Sprachen verfügbar sind und wie Locale-Fallbacks funktionieren.

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

---

### Uebersetzungen (`/config/i18n`)

Jede Datei in `/config/i18n` repräsentiert genau eine Locale und muss so benannt sein:

```text
<locale>.json
```

Beispiel:

```text
/config/i18n/fr-FR.json
```

---

#### Wie Uebersetzungen funktionieren

- Übersetzungen aus `/config/i18n` werden über die integrierten Übersetzungen gelegt
- Du musst nur die Keys definieren, die du überschreiben oder ergänzen möchtest
- Fehlende Keys fallen automatisch auf die internen Sprachdateien zurück

---

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

---

### Themes (`/config/assets/themes`)

Das Theme des öffentlichen Dashboards kann im Backend umgeschaltet werden und wird über den Schlüssel `theme` in der `config.json` gespeichert.

Das Backend ermittelt verfügbare Themes aus den integrierten Theme-Verzeichnissen der Anwendung und aus `/config/assets/themes/<theme-id>/meta.json`.

Themes aus `/config` ergänzen dabei die eingebauten Themes und können sie bei gleicher `id` auch überlagern.

---

#### Theme-Verzeichnisstruktur

Die folgende Verzeichnisstruktur gilt, wenn du im User-Config-Verzeichnis ein eigenes Theme anlegen möchtest.

```text
/config/assets/themes/<theme-id>/
├─ meta.json
├─ theme.css
├─ drawer.css
├─ theme.js
└─ assets/
```

`theme.js` und `assets/` sind optional. `assets/` kann theme-lokale Fonts oder Bilder enthalten, die von der Theme-CSS referenziert werden.

---

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
- fehlt `meta.json` oder ist sie ungültig, wird das Theme im Backend nicht angeboten

---

#### `theme.css`

Diese Datei enthält das Haupt-Styling für das öffentliche Dashboard des ausgewählten Themes.

Sie wird nur für das aktive Theme geladen.

Typische Ziele sind:

- `.page-header`
- `.section-nav`
- `.service`
- `.service-title`

---

#### `drawer.css`

Diese Datei enthält das Theme-spezifische Styling für den Info-Drawer.

Sie wird ebenfalls nur für das aktive Theme geladen.

Typische Ziele sind:

- `#info-drawer .panel`
- `#info-drawer .tab`
- `#info-drawer .section h3`
- `#info-drawer .kv`

---

#### `theme.js` (optional)

Themes können optional ein clientseitiges Skript unter folgendem Pfad mitbringen:

```text
/config/assets/themes/<theme-id>/theme.js
```

Wenn diese Datei für das aktive Theme existiert, wird sie nach den gemeinsamen Frontend-Skripten automatisch geladen.

Konvention:

- genau ein globales Objekt unter `window.OMVTheme` registrieren
- `init(context)` als Einstiegspunkt bereitstellen
- optional `destroy()` für Cleanup bereitstellen
- theme-spezifisches DOM und Verhalten in dieser Datei halten statt gemeinsame Core-Skripte anzupassen

Das `context`-Objekt enthält aktuell:

- `theme`
- `body`
- `document`
- `drawer`
- `version`

Beispiel:

```js
window.OMVTheme = {
  init({ body }) {
    if (document.getElementById('my-theme-root')) return;
    const el = document.createElement('div');
    el.id = 'my-theme-root';
    body.appendChild(el);
  },
  destroy() {
    document.getElementById('my-theme-root')?.remove();
  }
};
```

Ein vollständiges Beispiel, das sowohl CSS-Overrides als auch ein kleines `theme.js` zeigt, findest du unter [`config.example/assets/themes/sunrise`](./config.example/assets/themes/sunrise/).

---

#### Style-Vererbung

Theme-CSS ersetzt nicht das komplette Frontend, sondern erweitert die gemeinsamen Basis-Styles.

Ladereihenfolge auf der öffentlichen Seite:

1. Gemeinsame Basis-Styles wie `style.css`, `bg.css`, `drawer.css` und `drawer-icons.css`
2. `theme.css` des ausgewählten Themes
3. `drawer.css` des ausgewählten Themes
4. `theme.js` des ausgewählten Themes, falls vorhanden

Das bedeutet:

- Basislayout und gemeinsames Verhalten kommen weiterhin aus den integrierten Styles
- das aktive Theme überschreibt nur die Teile, die es verändern möchte
- eigene Themes sollten mit normalen Selektoren wie `.page-header` oder `#info-drawer .panel` arbeiten
- Klammer-Selektoren wie `body[data-theme="..."]` sind in eigenen Themes nicht erforderlich
- theme-spezifisches JavaScript sollte der Konvention `window.OMVTheme.init(context)` folgen

---

#### Eingebaute Themes ueberschreiben

Wenn du unter `/config/assets/themes/<theme-id>/` einen Ordner mit einer bereits existierenden Theme-ID anlegst und dort eine passende `meta.json` hinterlegst, wird dieses Theme im Backend und bei der Asset-Auflösung anstelle des eingebauten Themes verwendet.

Dadurch kannst du ein eingebautes Theme gezielt anpassen oder vollständig ersetzen, ohne Dateien im App-Verzeichnis zu ändern.

Gleichnamige Dateien wie `theme.css`, `drawer.css`, `theme.js` und theme-lokale Assets aus `/config` haben dabei Vorrang gegenüber der eingebauten Variante.

---

## Zusammenfassung

- `/config` ist optional
- Fehlende Dateien fallen immer auf integrierte Defaults zurück
- Übersetzungsdateien werden gemerged
- Bilder und andere Assets unter `/config/assets` überschreiben die passenden visuellen Assets
- Themes werden aus integrierten Assets und `/config/assets/themes` zusammengesetzt, können eingebaute Varianten überlagern und Verhalten optional über `theme.js` erweitern
