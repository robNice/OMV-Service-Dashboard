# OMV-Landingpage

Die OMV-Landingpage


## Aufbau /data/services.json


Die Navigationsstruktur besitzt zwei Ebenen.
Die erste Ebene stellt die Kategorie (sections) dar, 
die zweite die einzelnen Dienste (services) die der Kategorie untergeordnet sind.

```json
{
  "sections": [
    {
      "id": "media",
      "title": "Media",
      "thumbnail": "assets/media.png",
      "services": [
        {
          "title": "Jellyfin Media",
          "url": "https://jellyfin.cube.fritz.box",
          "logo": "assets/jellyfin.png"
        }
      ]
    }
  ]
}

```

## deploy.yml

Deployment der Landingpage direkt zu /opt/OMV-landingpage.
Strategie: Dateien nur löschen, wenn sie vorher im Repository waren.