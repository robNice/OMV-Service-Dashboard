# Konfiguration (`/config`)

--- 

## Inhalt

- [Einführung](#einführung)
- [TL;DR – Docker-Nutzer](#tldr--docker-nutzer)
- [Grundlegende Hinweise](#grundlegende-hinweise)
- [Verzeichnisstruktur](#verzeichnisstruktur)
- [Konfigurationsdateien](#konfigurationsdateien)
    - [`config.json`](#configjson)
    - [`services.json`](#servicesjson)
        - [Dateinamen für Sektion-Kartenbilder](#dateinamen-für-sektion-kartenbilder)
        - [Dateinamen für Sektion-Hintergrundbilder](#dateinamen-für-sektion-hintergrundbilder)
        - [Verfügbare Section-IDs](#verfügbare-section-ids)
        - [Services](#services)
        - [Standardbilder und Überschreibungen](#standardbilder-und-überschreibungen)
    - [`i18n-settings.json`](#i18n-settingsjson)
    - [Übersetzungen (`/config/i18n`)](#übersetzungen-configi18n)
        - [Wie Übersetzungen funktionieren](#wie-übersetzungen-funktionieren)
        - [Beispiel: `i18n/fr-FR.json`](#beispiel-i18nfr-frjson)
- [Eigene Assets (`/config/assets`)](#eigene-assets-configassets)
    - [Erlaubte Asset-Überschreibungen](#erlaubte-asset-überschreibungen)
    - [Regeln](#regeln)
    - [Nicht erlaubt](#nicht-erlaubt)
- [Zusammenfassung](#zusammenfassung)


---

## Einführung
Wann immer dieser `/config` erwähnt wird, ist damit **dein ganz persönliches**
`/config`-Verzeichnis für diese Anwendung gemeint, das entweder in deiner
`docker-compose.yml` gemountet oder über die Umgebungsvariable
`OMV_SERVICE_DASHBOARD_CONFIG` definiert wird.

Das `/config`-Verzeichnis enthält **optionale Benutzer-Overrides** für das
OMV Service Dashboard.

Um den Einstieg zu erleichtern, kopiere das Verzeichnis `config-example` in dein
`/config`-Verzeichnis und passe es an deine Bedürfnisse an.

Alle Dateien in diesem Verzeichnis werden **zur Laufzeit eingelesen** und
**überschreiben die integrierten Standardwerte**, die mit der Anwendung ausgeliefert werden.  
Nichts in `/config` ist zwingend erforderlich – fehlt eine Datei, greift die Anwendung
automatisch auf ihre internen Defaults zurück.

Die config.json wird beim Starten des Dienstes angelegt, wenn sie noch nicht vorhanden ist. 
Fehlt dir Datei, kannst du Sie aus dem Verzeichnis`config-example` in dein
`/config`-Verzeichnis kopieren.
Die services.json wird erst nach dem ersten Mal Speichern im Adminbereich angelegt.

> ⚠️ Dieses Verzeichnis ist ausschließlich für **Konfiguration und Inhalte**
> gedacht.  
> **JavaScript-, CSS- und andere Core-Dateien der Anwendung dürfen hier nicht
> abgelegt werden. Sie werden dort ohnehin nicht gelesen ;)**

---


## TL;DR – Docker-Nutzer

Wenn du das OMV Service Dashboard über Docker betreibst, definiere dein persönliches
Konfigurationsverzeichnis wie folgt:

```yaml
services:
  omv-service-dashboard:
    image: omv-service-dashboard
    volumes:
      - /pfad/zu/deinem/konfigurationsverzeichnis:/config
```
---
## Grundlegende Hinweise
- `/config` ist das **einzige Verzeichnis**, das du anpassen solltest
- Du kannst den Container jederzeit sicher aktualisieren oder neu erstellen
- Deine Konfigurationen, Übersetzungen und Bilder bleiben dabei unangetastet
- Existiert eine Datei nicht in `/config`, werden automatisch die integrierten
  Standardwerte verwendet

Du musst **niemals** Dateien innerhalb des Containers verändern.

---

## Verzeichnisstruktur

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

## Konfigurationsdateien

### `config.json`

Allgemeine Anwendungskonfiguration (z. B. Titel, Standard-Sprache).

Falls vorhanden, **ersetzt diese Datei vollständig** die interne
Standardkonfiguration.

Beispiel `config.json`:
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

- title: Wird als grundlegender title-Tag sowie als h1 verwendet
- defaultLang: Wird als Fallback-Sprache verwendet, wenn keine passende Locale gefunden wird
- infoDrawerRefreshInterval: Gibt an, wie oft der Info-Drawer aktualisiert werden soll (in Sekunden)
- port: Port, auf dem die Anwendung lauscht
- omvRpcPath: Pfad zum omv-rpc-Binary – wird benötigt, um die Datenträgerliste / SMART-Infos auszulesen
- sadmin: etze admin exakt wie dort zu sehen, um das Admin-Passwort auf das Default-Passwort `dashboard` festzulegen.

### `services.json`

Definiert die im Dashboard angezeigten Sektionen und Dienste.

Diese Datei **ersetzt vollständig** die interne Standard-`services.json`
(die lediglich eine Beispielkonfiguration darstellt).
Du solltest diese Datei **unbedingt anpassen**, damit sie zu deinem Setup passt.

Das folgende Beispiel definiert zwei Sektionen, von denen eine mit zwei Services
gefüllt ist und die andere leer ist (was nicht besonders sinnvoll ist, oder?
Ändere das jetzt!):

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
> ⚠️ Section-IDs müssen eindeutig sein. Section- und Service-Titel werden für
> title-Tags, h1 und Karten-Titel verwendet.
--- 
#### Dateinamen für Sektion-Kartenbilder

Die Dateinamen von Sektion-Kartenbildern müssen den Section-IDs entsprechen.

`"id": "admin"`
=> Es sollte also ein Bild mit dem Namen `admin.png`, `admin.gif`, `admin.jpg`
oder `admin.webp` existieren in

`/{dein-config-verzeichnis}/assets/cards/sections/`

falls es dort nicht existiert, in

`/data/assets/cards/sections/` 

Existiert es in keinem der beiden Verzeichnisse, wird ein Standardbild verwendet.

---

#### Dateinamen für Sektion-Hintergrundbilder

Jede Sektion besitzt außerdem ein eigenes Hintergrundbild.
Der Dateiname dieses Bildes muss ebenfalls der Section-ID entsprechen
(mit einer der folgenden Dateiendungen: png, gif, jpg, webp).

Das Bild sollte existieren in

`/{dein-config-verzeichnis}/assets/backgrounds/`

oder, falls es dort nicht existiert, in

`/data/assets/backgrounds/`

Existiert es in keinem der beiden Verzeichnisse, wird ein Standardbild verwendet.

---
#### Verfügbare Section-IDs
Hier ist eine vollständige Liste der Section-IDs für die es schon Karten- und 
Hintergrundbilder gibt:

- admin
- files
- kitchen
- media
- network
- smart-home

Falls du weitere Sektionen benötigst, kannst du fehlende Bilder einfach
in dein `config/assets/cards/sections`-Verzeichnis hinzufügen.
Behalte dabei im Hinterkopf: Der Dateiname lautet immer `{id}.` plus eine
beliebige der folgenden Endungen: png, gif, jpg oder webp.

---
#### Services
Services werden ein wenig anders konfiguriert:

```json
{
  "title": "OMV Webinterface",
  "url": "https://omv.my.local.domain",
  "logo": "omv.png"
}
```

- `title` wird als Karten-Titel verwendet
- `url` wird als Karten-Link verwendet (also das Ziel beim Klick auf die Karte)
- `logo` wird als Kartenbild verwendet. Dieses sollte in
  `/{dein-config-verzeichnis}/assets/cards/services/` abgelegt werden

Ist kein Logo definiert, wird ein Standardbild verwendet.

> ⚠️ 
> 
> Alle Kartenbilder sollten ungefähr 305px × 185px groß sein.

---

#### Standardbilder und Überschreibungen

Das Home-Hintergrundbild ist `assets/backgrounds/_home.png`.
Du kannst dein eigenes Home-Hintergrundbild verwenden, indem du ein Bild mit dem
Namen `_home` plus einer beliebigen der folgenden Dateiendungen
png, gif, jpg oder webp in dein `config/assets/backgrounds`-Verzeichnis legst.

Das Standard-Hintergrundbild ist `assets/backgrounds/_default.png`.
Du kannst dein eigenes Standard-Hintergrundbild verwenden, indem du ein Bild mit
dem Namen `_default` plus einer beliebigen der folgenden Dateiendungen
png, gif, jpg oder webp in dein `config/assets/backgrounds`-Verzeichnis legst.


Die Standard-Sektions- und Service-Kartenbilder sind
`assets/cards/sections/_default.png` und `assets/cards/services/_default.png`.
Du kannst deine eigenen Standardbilder verwenden, indem du jeweils ein Bild mit
dem Namen `_default` plus einer beliebigen der folgenden Dateiendungen
png, gif, jpg oder webp in die Verzeichnisse
`config/assets/cards/sections` und `config/assets/cards/services` legst.

---

### `i18n-settings.json`

> ⚠️ Obwohl du diese Datei theoretisch verwenden könntest, um die integrierten
> Übersetzungseinstellungen zu überschreiben, wird dies nicht empfohlen.
>
> Ich empfehle dringend, diese Datei **nicht** in deinem `/config`-Verzeichnis
> abzulegen, es sei denn, du hast einen wirklich guten Grund dafür.
> Andernfalls könntest du zukünftige Übersetzungen verpassen.

Steuert, welche Sprachen verfügbar sind und wie Sprach-Fallbacks funktionieren.
Die Sprache wird anhand der Browser-Sprache ermittelt
(genauer gesagt anhand des `Accept-Language`-Headers, den dein Browser sendet)
und fällt auf die Standard-Sprache zurück, falls keine passende Locale gefunden wird.


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

- `locales`  
  Liste der aktivierten Locales.

- `fallbacks`  
  Ordnet Sprachcodes (aus dem `Accept-Language`-Header) einer Fallback-Locale zu.

  Beispiel: Wenn du Franzose bist und dein Browser
  `Accept-Language: fr;(...)` sendet, ist die Fallback-Locale für `fr`
  entsprechend `fr-FR`.

  Ohne dieses Mapping wäre der Fallback-Wert derjenige, der in deiner
  `config.json` als `defaultLang` definiert ist.

Fehlt diese Datei, werden die integrierten Standardwerte verwendet.

---

### Übersetzungen (`/config/i18n`)

Jede Datei in `/config/i18n` repräsentiert **eine Locale** und muss wie folgt
benannt sein:

```
<locale>.json
```

Beispiel:

```
/config/i18n/fr-FR.json
```

Vollständige (und hoffentlich korrekte) Übersetzungen werden bereits für folgende
Sprachen mitgeliefert:

- Englisch
- Deutsch
- Französisch
- Spanisch
- Italienisch
- Niederländisch
- Polnisch
- Portugiesisch
- Türkisch
- Japanisch

Wenn du die Anwendung in eine weitere Sprache übersetzt oder Fehler in den
bestehenden Übersetzungen findest, ziehe bitte in Betracht, deine Übersetzungen
dem Projekt zur Verfügung zu stellen.

### Wie Übersetzungen funktionieren

- Übersetzungen aus `/config/i18n` werden **über** die integrierten Übersetzungen gelegt
- Du musst nur die Keys definieren, die du **überschreiben oder ergänzen** möchtest
- Fehlende Keys greifen automatisch auf die internen Sprachdateien zurück

### Beispiel: `i18n/fr-FR.json`

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

## Eigene Assets (`/config/assets`)

Wie oben bereits erwähnt, erlaubt `/config/assets` ausschließlich das
Überschreiben **visueller Inhalts-Assets**.

### Erlaubte Asset-Überschreibungen

```
/config/assets/
 ├─ backgrounds/
 └─ cards/
     ├─ sections/
     └─ services/
```

### Regeln

- Existiert ein Asset in `/config/assets`, **überschreibt** es die integrierte Version
- Existiert es nicht, greift die Anwendung auf `/data/assets` zurück
- Es werden ausschließlich **Bilder** unterstützt

### Nicht erlaubt

Die folgenden Dateien dürfen **niemals** in `/config/assets` abgelegt werden:

- JavaScript-Dateien
- CSS-Dateien
- Schriftarten
- Funktionsrelevante Application-Icons

Diese Dateien sind Teil des Anwendungskerns und bewusst unveränderlich.

---

## Zusammenfassung

- `/config` ist **optional**
- Fehlende Dateien greifen immer auf integrierte Defaults zurück
- Konfigurationsdateien ersetzen Standardwerte
- Übersetzungsdateien werden **gemerged**
- Assets überschreiben ausschließlich visuelle Inhalte
- Anwendungslogik und Styling sind **nicht anpassbar**
