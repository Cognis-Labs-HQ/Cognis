# Leseravatare und Details

**Feature-Zweig:** feature-message-receipt-integration

## Einheitliche Leseravatare

Profile 4.1.0 ergänzt `buildContent` um `tiny` (1.22rem, Initialen 0.5rem) und `compact` (1.65rem, Initialen 0.6rem). Die unveränderliche Liste `contentSizes` nennt alle fünf unterstützten Namen. Dies sind Grafikgrößen, keine Bedienflächen. Der Aufrufer besitzt getrennte zugängliche Ziele, Abstände und äußere Trennringe. `small`, `medium`, `large` und die Optionen von `buildMarkup` behalten ihre Bedeutung. Verbraucher der neuen Größen müssen die Liste prüfen und passendes Profile-JavaScript und CSS ausliefern. Messages 2.9.0 nutzt beide Größen; veröffentlichen Sie die Assets gemeinsam. Bestehende Profile-Tutorials behalten ihre Avatarbedienung und Größen.

## Bedienbare Leserliste

Wählen Sie **Gesehen von** neben einer gesendeten Nachricht, um Leser und Lesezeiten zu sehen. Das Fenster lässt sich per Tippen, Klicken oder Tastatur öffnen. Schließen oder Escape führt zum aktuellen Knopf zurück; Escape schließt zuerst eine aktive Profilvorschau. Tab folgt der normalen Seitenreihenfolge. Zeigen Sie auf einen Leseravatar oder fokussieren Sie ihn für die Profilvorschau; wählen Sie ihn zum Öffnen des Profils. Ohne Profilkennung bleibt der benannte Avatar unverlinkt. Leseravatare zeigen keine Verfügbarkeit. Kleine Kreise behalten ihre Größe in getrennten, nicht überlappenden 44px-Zielen. Lange Listen umbrechen; das Detailfenster scrollt innerhalb des Bildschirms.

## Commits

- [16fac9bdcdf56e9fb797d789b7580d01f394004d](https://github.com/Cognis-Labs-HQ/Cognis/commit/16fac9bdcdf56e9fb797d789b7580d01f394004d)
