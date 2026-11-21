# Bilder im Profilkopf erhalten

**Feature-Zweig:** feature-profile-hero-media-integrated

## Bilder bei Aktualisierungen behalten

Avatar und Banner bleiben bei unabhängigen Aktualisierungen und vorübergehenden Lesefehlern erhalten. Geänderte Schlüssel, bestätigte Abwesenheit und verweigerter Zugriff entfernen weiterhin das richtige Bild.

## Gültigkeitsdauer der Medien verwalten

Profile 3.0.20 bindet asynchrone Abrufe, Uploads, Löschungen und die Dateiauswahl an die aktive Route, Sitzung und den Anbieter. Aufgegebene Objekt-URLs werden freigegeben; verspätete Ergebnisse können kein neueres Profil verändern. Die Verträge für Editor und Avatar-Vorschau bleiben erhalten.

## Commits

- [fe35a1014c0855146dec07fc429710e92a108822](https://github.com/Cognis-Labs-HQ/Cognis/commit/fe35a1014c0855146dec07fc429710e92a108822)
- [64016cd661bcc27e36e2c379a9541064a2dd71ab](https://github.com/Cognis-Labs-HQ/Cognis/commit/64016cd661bcc27e36e2c379a9541064a2dd71ab)
