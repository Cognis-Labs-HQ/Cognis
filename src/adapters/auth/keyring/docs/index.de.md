# Adapter für den verschlüsselten Schlüsselbund

## Überblick

Der Adapter für den verschlüsselten Schlüsselbund speichert undurchsichtige, im Browser verschlüsselte Tresore für authentifizierte Konten. Er ist ein erforderlicher Authentifizierungsadapter, damit Passwörter, Verschlüsselungsschlüssel und andere benutzerspezifische Geheimnisse unabhängig vom aktiven Anmeldeanbieter über eine stabile Fähigkeit verfügbar sind.

Die Browser-Schnittstelle bleibt `src/ui/reuse/keyring.js`. Ver- und Entschlüsselung erfolgen im Browser; der Adapter erhält niemals Klartextgeheimnisse.

## Verantwortlichkeiten

- Den Tresorspeicher über die Fähigkeit `db:executor` initialisieren.
- Routenfabrik und Tresorspeicher über `ctx` bereitstellen.
- Validierte, undurchsichtige Tresorumschläge speichern und zurückgeben.

Nicht verantwortlich für: Benutzeranmeldung, Schlüsselableitung oder Interpretation gespeicherter Geheimnisse.

## Architektur

`src/adapters/auth/keyring/index.ts` wird vom Authentifizierungs-Gateway entdeckt und stellt `auth:keyringVaultStore` sowie `auth:keyringRouteFactory` bereit. Das Gateway übergibt seinen Routenkontext an die Fabrik, sodass Authentifizierungsprüfungen injiziert bleiben. `src/adapters/auth/keyring/store.ts` greift ausschließlich über die Datenbank-Executor-Fähigkeit auf die Persistenz zu.

## Konfiguration

Der erforderliche Adapter besitzt keine konfigurierbaren Felder und verwendet den aktiven `db:executor`-Anbieter.

## API-Routen

| Methode | Pfad                   | Beschreibung                     | Authentifizierung |
| ------- | ---------------------- | -------------------------------- | ----------------- |
| GET     | `/api/v1/auth/keyring` | Verschlüsselten Tresor lesen.    | Benutzer          |
| PUT     | `/api/v1/auth/keyring` | Verschlüsselten Tresor ersetzen. | Benutzer          |
| DELETE  | `/api/v1/auth/keyring` | Verschlüsselten Tresor löschen.  | Benutzer          |
