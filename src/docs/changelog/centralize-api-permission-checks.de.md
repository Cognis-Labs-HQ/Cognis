# PR-Changelog — API-Berechtigungsprüfungen zentralisieren

## Zusammenfassung

Behoben: Ein Fehler, bei dem die Rolle `owner` auf benutzerbezogene
API-Endpunkte keinen Zugriff hatte, da Route-Handler exakte
`role === "admin"`-Zeichenkettenvergleiche verwendeten statt eines
rangbasierten Vergleichs. Da `owner` in der Rollenhierarchie höher als
`admin` eingestuft ist, erhielten Besitzer bei Endpunkten wie
`GET /api/v1/users/:id/emails` fälschlicherweise den Fehler 403.

Eingeführt wurden zwei wiederverwendbare Hilfsfunktionen in
`src/gateways/auth/guard.ts`:

- `hasMinRole(role, minRole)` — gibt `true` zurück, wenn die angegebene Rolle
  den Mindestrang erreicht oder überschreitet, gemäß der kanonischen
  Hierarchie `user < teacher < moderator < admin < owner`.
- `canAccessUserData(claims, targetUsername)` — gibt `true` zurück, wenn der
  Aufrufer der Zielnutzer selbst ist oder mindestens Adminrang besitzt.

Beide Hilfsfunktionen werden über `src/gateways/shared.ts` für
Gateway-Autoren exportiert. Alle Route-Handler, die bisher Ad-hoc-
Zeichenkettenvergleiche gegen `"admin"` oder `"owner"` vornahmen,
verwenden nun diese Hilfsfunktionen.

## Geänderte Komponenten und Dateien

- Auth Guard (neue Hilfsfunktionen):
    - `src/gateways/auth/guard.ts`
    - `src/gateways/shared.ts`
- Notify-Gateway-Routen (Besitzer-Zugriff behoben):
    - `src/gateways/notify/bootstrap.ts`
    - `src/gateways/notify/routes/notifications.ts`
- Benutzerrouten (Konsistenzaktualisierung):
    - `src/api/routes/users/index.ts`
- Profil-Adapter-Routen (Besitzer-Zugriff behoben und vereinheitlicht):
    - `src/adapters/social/profile/routes/preferences.ts`
    - `src/adapters/social/profile/routes/files.ts`
    - `src/adapters/social/profile/routes/posts.ts`
- Tests (neue Abdeckung für Besitzerzugriff):
    - `src/gateways/notify/tests/email-routes.test.ts`
    - `src/gateways/notify/routes/tests/notification-routes.test.ts`
