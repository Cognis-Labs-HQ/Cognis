# Vertrauenswürdige Domains

## Zusammenfassung

Es wurde eine gemeinsame Prüfung für vertrauenswürdige Domains hinzugefügt, sodass die Sicherheitsliste in der Administration jetzt sowohl E-Mail-Domain-Prüfungen als auch vertrauenswürdige externe HTTP(S)-Broadcast-Weiterleitungen und -Links steuert.

Die Prüfung von Broadcast-Weiterleitungen akzeptiert jetzt URLs derselben Origin und vertrauenswürdige Domains, während UI- und Server-Prüfungen dieselben Abgleichsregeln einschließlich Subdomains verwenden.

## Geänderte Dateien / Komponenten

- `src/api/reuse/security-settings.ts` und `src/api/routes/system/index.ts` — Zentralisierte Auswertung der Sicherheitseinstellungen sowie gemeinsame Prüfung für vertrauenswürdige Domains und URLs.
- `src/gateways/registration/bootstrap.ts` — Wiederverwendung des gemeinsamen Domain-Abgleichs für die Prüfung von Einladungs-E-Mail-Adressen.
- `src/gateways/notify/bootstrap.ts`, `src/gateways/notify/routes/notifications.ts` und `src/gateways/notify/ui/*` — Vertrauenswürdige externe Broadcast-Weiterleitungen erlaubt und gemeinsame Prüfungen in Admin- und Laufzeitabläufen wiederverwendet.
- `src/ui/reuse/trusted-domains.js`, `src/ui/app/administration/security.js` und `src/ui/app/settings/general-prefs.js` — Gemeinsames Laden vertrauenswürdiger Domains im UI, Cache-Invalidierung und Abgleich für E-Mail- und Link-Prüfungen hinzugefügt.
- `src/api/tests/security-settings.test.ts`, `src/gateways/notify/routes/tests/notification-routes.test.ts` und `src/ui/tests/trusted-domains.test.js` — Testabdeckung für Domain-Normalisierung und URL-Prüfung ergänzt.
- `src/api/package.json`, `src/gateways/notify/manifest.json`, `src/gateways/registration/manifest.json` und `src/docs/versions.en.md` — Komponenten-Versionen für API, Notification-Gateway und Registration-Gateway erhöht.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/85294ff
