# Admins aus Invite-Menü raus

**Feature Branch:** copilot/exclude-admins-from-invite-menu

## Zusammenfassung

Die Sichtbarkeitsregel für den Invite-Eintrag in der Registration-Navigationsleiste wurde angepasst, sodass Gründer mit admin-äquivalentem Zugriff den Invite-Eintrag nicht sehen.

Admins und Owner verwalten Einladungen bereits über die Users-Seite, daher bleibt der Invite-Schnellzugriff jetzt ausschließlich für nicht-admin Gründer sichtbar.

## Geänderte Dateien / Komponenten

- `src/gateways/registration/ui/navbar.js` — Normalisierung der Admin-Rollen (`admin` und `owner`) hinzugefügt und in der Invite-Sichtbarkeitsprüfung verwendet.
- `src/gateways/registration/tests/navbar.test.js` — Regressionstest ergänzt, der den Ausschluss admin-äquivalenter Gründer im Invite-Menü absichert.
- `src/gateways/registration/bootstrap.ts`, `src/gateways/registration/manifest.json` und `src/docs/versions.en.md` — Version der Registration-Gateway-Komponente auf `1.1.7` erhöht.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/041fdb8
- https://github.com/Cognis-Labs-HQ/Cognis/commit/d47ee73
