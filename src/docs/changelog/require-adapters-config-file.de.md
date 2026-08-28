# Admin-Steuerverträge erzwingen

**Feature Branch:** copilot/require-adapters-config-file

## Zusammenfassung

Die Adapter-Steuerungen in der Administration wurden vereinheitlicht, sodass Gateways ihre Adapter-Endpunkte für Konfiguration und Umschalten ankündigen, Registration-Adapter leere Konfigurationsspeicherungen akzeptieren und Study-Adapter einen Disable-Endpunkt bereitstellen.

Die Administrationsseite nutzt diese angekündigten Steuerungen jetzt direkt und synchronisiert die Schalter nach einem Refresh erneut, damit der Gateway-Slider beim Deaktivieren des letzten aktiven Adapters korrekt auf Disabled bleibt.

## Geänderte Dateien / Komponenten

- `src/api/reuse/adapter-admin-controls.ts` — Gemeinsame API-Hilfe zum Ankündigen von Adapter-Endpunkten für Konfiguration, Aktivierung, Deaktivierung und optionalen Test hinzugefügt.
- `src/ui/app/administration/index.js` — Die Administration-UI auf angekündigte Adapter-Steuerungen umgestellt und Gateway-/Adapter-Schalter nach Page-Composer-Refreshes neu synchronisiert.
- `src/gateways/registration/bootstrap.ts`, `src/gateways/study/bootstrap.ts`, `src/gateways/social/bootstrap.ts` und `src/gateways/notify/bootstrap.ts` — Adapter-Steuerungen in Gateway-Listen angekündigt und die fehlenden Registration-/Study-Admin-Routen ergänzt.
- `src/gateways/study/gateway.ts` — Laufzeitunterstützung zum Aktivieren und Deaktivieren von Study-Adaptern sowie Konfigurationsspeicherungen mit `enabled`-Beachtung ergänzt.
- `src/gateways/registration/tests/bootstrap.test.ts` und `src/gateways/study/tests/bootstrap.test.ts` — Regressionstests für angekündigte Steuerungen und die reparierten Adapter-Admin-Routen ergänzt.
- `.github/copilot-instructions.md`, `src/gateways/{notify,registration,social,study}/manifest.json` und `src/docs/versions.en.md` — Die Anforderung an Adapter-Steuerungsverträge dokumentiert und die betroffenen Gateway-Versionen erhöht.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/6b706ae
