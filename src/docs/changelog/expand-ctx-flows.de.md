# Änderungsprotokoll — ctx flows

**Feature Branch:** N/A

## Zusammenfassung

Das `ctx`-Flow-System ist jetzt der ausschließliche Weg für die
Benutzerbereitstellung, die Nachrichtenzustellung und die Meeting-Erstellung.
Legacy-Direktzugriffe auf den Store wurden aus diesen Routen entfernt. Die API
gibt 503 zurück, wenn erforderliche Flows nicht verfügbar sind, anstatt
stillschweigend auf nicht orchestrierte Code-Pfade zurückzufallen.

Alle sekundären Gateways (TFA, Registrierung, Studium, Kalender, Notify)
registrieren nun `bootstrap-platform/register-flows`-Hooks, um am Bootstrap-Flow
teilzunehmen, wenn das Auth-Gateway vorhanden ist. Jede Registrierung ist mit
`hasFlow` abgesichert, damit isolierte Testumgebungen auch ohne den vollständigen
Gateway-Stack weiter funktionieren.

Der `validate-message`-Hook des Social-Gateways wurde aktualisiert, um
verschlüsselte Inhaltsfelder (`ciphertext` und `iv`) statt des
Klartextfelds `content` zu prüfen, was dem tatsächlichen Wire-Format entspricht.

Der Messages-Adapter registriert nun `persist-message`- und `fan-out`-Hooks
im `send-message`-Flow. Der Send-Handler in room-routes delegiert vollständig
an diesen Flow und liest die gespeicherte Nachricht aus dem Stage-Ergebnis.

Das Jitsi-Meet-Modul registriert nun alle MEETINGS-Flow-Katalogeinträge und
fügt Hooks für `construct-meetings-ui/resolve-providers` und
`create-meeting/validate-request` hinzu.

Die deprovision-user-Route liest nun `revokedTokenCount` aus dem
`cleanup-dependencies`-Stage-Ergebnis und prüft das `authorize-request`-
Stage-Ergebnis auf Autorisierungsfehler (403).

## Geänderte Komponenten und Dateien

- `src/api/routes/users/index.ts`
- `src/gateways/notify/bootstrap/index.ts`
- `src/gateways/tfa/bootstrap/index.ts`
- `src/gateways/registration/bootstrap/index.ts`
- `src/gateways/social/bootstrap.ts`
- `src/gateways/study/bootstrap.ts`
- `src/gateways/calendar/bootstrap/index.ts`
- `src/modules/jitsi-meet/bootstrap.js`
- `src/adapters/social/messages/index.ts`
- `src/adapters/social/messages/routes/shared.ts`
- `src/adapters/social/messages/routes/room-routes.ts`
- `src/api/tests/users/user-routes.test.ts`
- `src/adapters/social/messages/tests/routes-notifications.test.ts`

## Commits
