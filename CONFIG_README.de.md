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
  - [Bild-Overrides (`/config/assets`)](#bild-overrides-configassets)
  - [Themes (`/config/assets/themes`)](#themes-configassetsthemes)
    - [Theme-Verzeichnisstruktur](#theme-verzeichnisstruktur)
    - [`meta.json`](#metajson)
      - [Theme-Settings-Schema](#theme-settings-schema)
      - [Unterstuetzte Feldtypen](#unterstuetzte-feldtypen)
      - [`text`](#text)
      - [`textarea`](#textarea)
      - [`number`](#number)
      - [`range`](#range)
      - [`color`](#color)
      - [`select`](#select)
      - [`radio`](#radio)
      - [`boolean`](#boolean)
    - [`theme.css`](#themecss)
    - [`drawer.css`](#drawercss)
    - [`theme.js` (optional)](#themejs-optional)
    - [Style-Vererbung](#style-vererbung)
    - [Eingebaute Themes ueberschreiben](#eingebaute-themes-ueberschreiben)
- [Zusammenfassung](#zusammenfassung)

---

## Einfuehrung


Wann immer hier von `/config` die Rede ist, ist damit das Benutzer-Config-Verzeichnis des NAS Portals gemeint.

Alle dauerhaft gespeicherten Änderungen aus dem Admin-Bereich werden dort abgelegt.

Im Docker-Betrieb wird dieses Verzeichnis normalerweise nach `/config` im Container gemountet.

Im Standalone-Betrieb sollte es in der Regel explizit per `--config-dir` übergeben werden. `OMV_SERVICE_DASHBOARD_CONFIG` dient nur als Fallback, wenn kein CLI-Parameter gesetzt ist.

Die meisten Änderungen kannst du bequem über den Admin-Bereich der Anwendung vornehmen. Diese README ist vor allem dann relevant, wenn du Konfigurationen manuell bearbeiten, Übersetzungen ergänzen oder eigene Themes und Assets hinterlegen möchtest.

Um den Einstieg zu erleichtern, kannst du das Verzeichnis `config.example` in dein eigenes `/config`-Verzeichnis kopieren und dort anpassen.

Alle Dateien in `/config` werden zur Laufzeit eingelesen und überschreiben dort, wo es vorgesehen ist, die integrierten Standardwerte. Fehlende Dateien fallen automatisch auf die internen Defaults zurück.

Die `config.json` wird beim ersten Start angelegt, falls sie noch nicht existiert. Die `services.json` entsteht nach dem ersten Speichern im Admin-Bereich. Hochgeladene Sektions-Hintergründe, Sektions-Karten und Service-Karten werden ebenfalls in diesem Verzeichnis abgelegt.

Dieses Verzeichnis ist für Konfiguration, Inhalte und unterstützte Frontend-Overrides wie Themes gedacht. Beliebige Core-Dateien der Anwendung sollten hier nicht abgelegt werden.

---

## TL;DR fuer Docker-Nutzer

Wenn du das NAS Portal über Docker betreibst, mounte dein persönliches Konfigurationsverzeichnis so:

```yaml
services:
  omv-service-dashboard:
    image: omv-service-dashboard
    volumes:
      - /pfad/zu/deinem/konfigurationsverzeichnis:/config
```

Alle dauerhaft gespeicherten Änderungen aus dem Admin-Bereich werden in dieses gemountete Verzeichnis geschrieben.

`OMV_SERVICE_DASHBOARD_CONFIG` musst du im Docker-Betrieb normalerweise nicht setzen, weil `/config` im Container bereits der Standardpfad ist.

---

## Grundlegende Hinweise

- `/config` ist das einzige Verzeichnis, das du anpassen solltest
- Du kannst den Container jederzeit sicher aktualisieren oder neu erstellen
- Deine Konfiguration, Übersetzungen, Bilder und Themes bleiben dabei erhalten
- Existiert eine Datei nicht in `/config`, werden automatisch die integrierten Standardwerte verwendet
- Sektions-Hintergründe, Sektions-Karten und Service-Karten können über `/config/assets` überschrieben werden

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
  "title": "NAS Portal",
  "defaultLang": "en-gb",
  "theme": "classic",
  "themeSettings": {},
  "infoDrawerRefreshInterval": 30,
  "port": 3000
}
```

- `title`: Wird als Basistitel und Seitenüberschrift verwendet
- `defaultLang`: Fallback-Sprache, falls keine passende Locale gefunden wird
- `theme`: Aktives Theme für das öffentliche Dashboard
- `themeSettings`: Gespeicherte Werte für Theme-spezifische Einstellungen aus dem Admin-Bereich
- `infoDrawerRefreshInterval`: Aktualisierungsintervall des Info-Drawers in Sekunden
- `port`: Port, auf dem die Anwendung lauscht
- `admin`: Admin-Passwortblock; er wird nach dem ersten Start oder nach einer Passwortänderung im Admin-Bereich automatisch ergänzt

Wenn du das Admin-Passwort vergessen hast, kannst du den `admin`-Block in der `config.json` löschen und den Dienst anschließend neu starten. Beim nächsten Start wird das Admin-Passwort dann erneut auf das Default-Passwort `dashboard` gesetzt.

---

### `services.json`

Definiert die im Dashboard angezeigten Sektionen und Dienste.

Seit es den Admin-Bereich gibt, ist die manuelle Bearbeitung dieser Datei normalerweise nicht mehr notwendig.

Die Datei wird automatisch geschrieben, wenn du Sektionen und Dienste im Admin-Bereich speicherst.

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

### Bild-Overrides (`/config/assets`)

Der Admin-Bereich kann benutzerdefinierte Bilder nach `/config/assets` hochladen. Diese Dateien überlagern die eingebauten Standardbilder für dasselbe logische Ziel.

Relevante Verzeichnisse:

```text
/config/assets/backgrounds
/config/assets/cards/sections
/config/assets/cards/services
```

Typische Beispiele:

- `/config/assets/backgrounds/_home.*` für den Home-Hintergrund
- `/config/assets/cards/sections/media.*` für die Sektions-Karte von `media`
- `/config/assets/cards/services/jellyfin.*` für die Service-Karte von `jellyfin`

Die konkrete Dateiendung ist für das Frontend nicht wichtig. Der Server löst das passende Bild automatisch auf.

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

Wenn du im Admin-Bereich theme-spezifische Optionen anbieten willst, kannst du in `meta.json` zusätzlich ein Array `settings` definieren.

Erweitertes Beispiel:

```json
{
  "id": "test",
  "label": "Test",
  "description": "Eigenes Dashboard-Theme",
  "version": "1.0.0",
  "settings": [
    {
      "id": "accent-color",
      "group": "Farben",
      "label": "Akzentfarbe",
      "description": "Wird für Buttons und Hervorhebungen verwendet.",
      "type": "color",
      "default": "#60a5fa"
    }
  ]
}
```

##### Theme-Settings-Schema

Jeder Eintrag in `settings` beschreibt genau einen konfigurierbaren Wert für das ausgewählte Theme.

Unterstützte Schlüssel:

- `id`: Stabiler Setting-Key. Daraus werden auch CSS-Variablen und `data-`Attribute erzeugt.
- `group`: Optionale Gruppenbezeichnung im Admin-Modal. Damit kannst du größere Settings-Sammlungen wie `Drawer`, `Cards` oder `Status Chips` strukturieren.
- `label`: Sichtbare Feldbezeichnung im Admin-Bereich.
- `description`: Optionaler Hilfetext unter dem Feld.
- `type`: Bestimmt Validierung und verwendetes Formular-Element.
- `default`: Standardwert, solange der Benutzer noch keinen Override gespeichert hat.
- `options`: Pflicht für `select` und `radio`. Jede Option braucht `value` und `label`.

Wichtige Hinweise:

- die Settings werden vom Theme in `meta.json` beschrieben
- die vom Benutzer gewählten Werte werden getrennt in `config.json` gespeichert
- das Backend validiert alle Werte gegen das Schema, bevor sie ans Frontend gehen
- das Frontend verwendet dafür immer den festen Prefix `themesetting`
- CSS-Variablen sehen dann z. B. so aus: `--themesetting-accent-color`
- HTML-Attribute sehen dann z. B. so aus: `data-themesetting-card-style="glass"`
- Theme-JavaScript erhält die validierten Werte über `window.OMVTheme.init({ settings })`

##### Unterstuetzte Feldtypen

Die folgenden Feldtypen werden aktuell von Backend und Admin-UI unterstützt.

##### `text`

Für kurze freie Texteingaben.

Beispiel:

```json
{
  "id": "headline-text",
  "group": "Header",
  "label": "Headline-Text",
  "type": "text",
  "default": "Dashboard"
}
```

Typische Einsätze:

- kurze Labels
- CSS-Klassen oder Style-Tokens
- kleine Textbausteine

##### `textarea`

Für mehrzeilige Texteingaben.

Beispiel:

```json
{
  "id": "welcome-copy",
  "group": "Header",
  "label": "Einleitungstext",
  "type": "textarea",
  "default": "Willkommen im Dashboard."
}
```

Typische Einsätze:

- längere Textblöcke
- Hinweise
- theme-spezifische Texte

##### `number`

Für numerische Werte mit direkter Eingabe.

Beispiel:

```json
{
  "id": "card-pixel-width",
  "group": "Pixelation",
  "label": "Card-Pixelbreite",
  "type": "number",
  "default": 40
}
```

Typische Einsätze:

- Abmessungen
- Abstände
- Zählwerte

##### `range`

Für numerische Werte, die sich besser per Slider einstellen lassen.

Beispiel:

```json
{
  "id": "overlay-opacity",
  "group": "Effekte",
  "label": "Overlay-Deckkraft",
  "type": "range",
  "default": 60
}
```

Typische Einsätze:

- Deckkraft
- Intensität
- skalierbare Werte

##### `color`

Für Farbwerte. Im Admin-Bereich wird dafür ein Color-Picker gerendert.

Beispiel:

```json
{
  "id": "drawer-text-color",
  "group": "Drawer",
  "label": "Drawer-Textfarbe",
  "type": "color",
  "default": "#d7e2ff"
}
```

Typische Einsätze:

- Schriftfarben
- Hintergrundfarben
- Chip-Farben
- Rahmen oder Highlights

##### `select`

Für kompakte Dropdowns mit vordefinierten Optionen.

Beispiel:

```json
{
  "id": "card-style",
  "group": "Cards",
  "label": "Card-Stil",
  "type": "select",
  "default": "glass",
  "options": [
    { "value": "solid", "label": "Solid" },
    { "value": "glass", "label": "Glass" }
  ]
}
```

Typische Einsätze:

- Modi mit mehreren Optionen
- kompakte Auswahllisten

##### `radio`

Für kleine Mengen gegenseitig ausschließender Optionen, die direkt sichtbar bleiben sollen.

Beispiel:

```json
{
  "id": "header-alignment",
  "group": "Header",
  "label": "Header-Ausrichtung",
  "type": "radio",
  "default": "center",
  "options": [
    { "value": "left", "label": "Links" },
    { "value": "center", "label": "Zentriert" },
    { "value": "right", "label": "Rechts" }
  ]
}
```

Typische Einsätze:

- Layout-Varianten
- Ausrichtungsoptionen
- kleine Optionsmengen

##### `boolean`

Für Wahr/Falsch-Werte. Im Admin-Bereich wird dafür eine Checkbox gerendert.

Beispiel:

```json
{
  "id": "show-glow",
  "group": "Effekte",
  "label": "Glow aktivieren",
  "type": "boolean",
  "default": true
}
```

Typische Einsätze:

- Umschalter
- Ein/Aus-Flags
- optionale Effekte

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
