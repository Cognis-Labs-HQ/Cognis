# Technische Referenz

Der Browser-Host besitzt Routing, gemeinsame Darstellung, Lokalisierung und Wiederherstellung öffentlicher Ressourcen.

## Schnittstellen

`uiCtx.capabilities` löst aktive Browseranbieter auf; `bindCapability(id)` wartet mit begrenzten Startaufrufen auf deren Registrierung. `ui:log` sendet Diagnosen an [Logging](/docs/gateways/logging/technical). Seiten erhalten ein AbortSignal und entfernen eigene Registrierungen beim Ende. [Page Composer](/docs/page-composer/technical), [Tutorials](/docs/tutorials/technical) und [Komponentenfenster](/docs/focus-control/technical) definieren ihre öffentlichen UI-Verträge.

## Konfiguration

Sprache, Thema und Schrift kommen aus den Kontoeinstellungen. Gemeinsame Texte verwenden flache `ui.reuse.*`-Schlüssel, Komponentenkataloge ihren Eigentümernamensraum. Die Auflösung versucht die gewählte Sprache und dann Englisch; ein fehlender englischer Schlüssel ist ein Fehler. Oberflächen verwenden Thementokens. [Profile](/docs/adapters/social/profile/technical) speichert Kontoeinstellungen.

## Verhalten

Der SPA-Router lädt deklarierte Seiten und bricht überholte Mounts ab; direkte URLs verwenden dieselben Einstiegspunkte. Shell-Ressourcen sind von Gateway-/Adapterseiten getrennt.

Der Service Worker speichert öffentliche Ressourcen, keine privaten API-Antworten oder authentifizierten Dokumente. Veränderliche Ressourcen können Cache-Daten ausliefern, während eine bedarfsgesteuerte Netzaktualisierung höchstens einmal pro Minute läuft. Inhaltsgehashte Ressourcen verwenden unveränderliche Daten. Worker-Updates warten, bis vorhandene kontrollierte Tabs geschlossen sind. Verbindungswiederherstellung bietet geschütztes Neuladen.

Private Offline-Kopien und vorgemerkte Änderungen gehören zu Konto/Sitzung und Eigentümer. Öffentlicher Code im Cache gewährt keine Datenrechte. Hinweise, Ladeanzeigen und Popups folgen dem Host-Lebenszyklus; Anbieterfehler werden über das Gateway protokolliert.

## Sicherheit

Eigentümer prüfen Rechte vor Datenzugriff und Änderungen; versteckte Navigation ist nur Darstellung. Private Daten, Zugangsdaten und authentifiziertes HTML gehören nicht in öffentliche Cache-APIs. Rich Text verwendet den geeigneten Renderer.

## Referenz

- [src/ui/reuse/ui-ctx.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/ui-ctx.js)
- [src/ui/reuse/app-router.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/app-router.js)
- [src/ui/reuse/i18n.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/i18n.js)
- [src/ui/public/sw.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/public/sw.js)
