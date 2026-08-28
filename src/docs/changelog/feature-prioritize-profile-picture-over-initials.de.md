# Profilbilder in Nachrichten

## Zusammenfassung

Die Avatar-Darstellung im Messages-Adapter bevorzugt nun tatsächliche
Profilbilder gegenüber Initialen. Ein neues gemeinsames Modul im Social-Gateway
zentralisiert das authentifizierte Abrufen von Avataren und die Initialen-
Ausweichlösung, sodass die Logik über alle UI-Oberflächen des Social-Adapters
wiederverwendet werden kann.

## Geänderte Dateien / Komponenten

- **`src/gateways/social/ui/reuse/profile-avatar.js`** _(neu)_ — gemeinsames
  Modul mit den Exporten `fetchProfileAvatarBlobUrl`,
  `isProfileAvatarUnavailable`, `buildProfileAvatarMarkup`,
  `hydrateProfileAvatars` und `handleProfileAvatarError`.
- **`src/adapters/social/messages/ui/app.js`** — doppelte Avatar-Hilfsfunktionen
  entfernt; die gesamte Avatar-Darstellung delegiert nun an das gemeinsame
  Gateway-Modul.
- **`src/adapters/social/messages/routes.ts`** — `enrichMembersWithProfiles`
  enthält nun `avatarKey` in der angereicherten Member-Struktur.
- **`src/adapters/social/profile/ui/navbar.js`** — der Avatar-Anbieter der
  Dashboard-Navigationsleiste verwendet `fetchProfileAvatarBlobUrl` aus dem
  gemeinsamen Modul.
- **`src/adapters/social/messages/tests/bootstrap.test.ts`** — aktualisierte
  Regressionsprüfungen für den Avatar-Fallback auf den neuen gemeinsamen
  Modulspeicherort.
- **`src/adapters/social/messages/tests/routes.test.ts`** — Prüfung ergänzt,
  dass `GET /messages/rooms` `avatarKey`-Werte für Mitglieder zurückgibt.

## Commit-Links

- https://github.com/Cognis-Labs-HQ/Cognis/commit/9f78b06
- https://github.com/Cognis-Labs-HQ/Cognis/commit/5399b86
