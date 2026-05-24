# TFA Gateway

## Überblick

Das TFA-Gateway besitzt alle Zwei-Faktor-Funktionen in Cognis. Es entdeckt Methodenadapter unter `src/adapters/tfa/`, speichert Adapterzustand und Recovery-Codes, entscheidet über verpflichtende Einrichtung und verifiziert zweite Faktoren beim Login.

Das Auth-Gateway kennt keine TOTP- oder zukünftigen Methodendetails. Es prüft nur den primären Anmeldeschritt und nutzt danach die vom TFA-Gateway bereitgestellten Capabilities.

## Aufgaben

- TFA-Adapter aus `src/adapters/tfa/*` entdecken.
- Adapterkonfiguration und Aktivierungszustand speichern.
- Gespeicherten Adapterzustand laden, ohne deaktivierte Adapter wieder zu aktivieren.
- Setup-, Aktivierungs-, Präferenz- und Recovery-Code-Routen bereitstellen.
- Verpflichtende Einrichtung erzwingen, wenn globale TFA-Pflicht aktiv ist.
- Login-Challenges prüfen und Recovery-Codes atomar verbrauchen.
- Eigene Settings-/Admin-UI und statische Assets registrieren.

Nicht zuständig für: Passwortregeln, Primäranmeldung oder Kontoerstellung.

## Architektur

`src/gateways/tfa/gateway.ts` definiert `CoreTfaGateway`. Diese Klasse verwaltet Adapter, delegiert methodenspezifisches Setup und Login-Verify an Adapter und zentralisiert gemeinsame Richtlinien wie Recovery-Codes, bevorzugte Methoden und globale Erzwingung.

Bootstrap in `src/gateways/tfa/bootstrap.ts`:

1. `DbTfaStore` erzeugen und Schema sicherstellen.
2. Adapter unter `src/adapters/tfa/` entdecken.
3. Persistierte Adapterkonfiguration laden.
4. API- und Adapter-Adminrouten registrieren.
5. TFA-eigene Settings-/Admin-UI registrieren.
6. TFA-Capabilities für Auth und andere Gateways beitragen.

## Capabilities

Das Gateway registriert diese Capabilities über `ctx.capabilities`:

- `tfa:getUserStatus(accountId)`
- `tfa:getLoginMethods(accountId)`
- `tfa:verifyLogin(accountId, methodId, payload)`
- `tfa:isSecondFactorEnabled(accountId)`
- `tfa:isSetupRequired(accountId)`
- `tfa:resetUser(accountId)`
- `tfa:getEnforceAllUsers()`
- `tfa:setEnforceAllUsers(required)`

Diese Oberfläche ist der unterstützte Integrationspunkt. Andere Komponenten dürfen keine TFA-Adapter-Interna direkt importieren.

## API-Routen

| Methode | Pfad | Beschreibung | Auth |
| ------- | ---- | ------------ | ---- |
| `GET` | `/api/v1/tfa/status` | Setup-Status des aktuellen Nutzers lesen | Bearer |
| `GET` | `/api/v1/tfa/methods` | Methoden- und Recovery-Metadaten lesen | Bearer |
| `POST` | `/api/v1/tfa/methods/:id/setup/begin` | Methodensetup starten | Bearer |
| `POST` | `/api/v1/tfa/methods/:id/setup/verify` | Setup verifizieren | Bearer |
| `POST` | `/api/v1/tfa/methods/:id/setup/cancel` | Setup abbrechen | Bearer |
| `POST` | `/api/v1/tfa/methods/:id/enable` | Gespeicherte Methode aktivieren | Bearer |
| `POST` | `/api/v1/tfa/methods/:id/disable` | Methode deaktivieren | Bearer |
| `PUT` | `/api/v1/tfa/methods/preferences` | Bevorzugte Reihenfolge speichern | Bearer |
| `GET` | `/api/v1/tfa/recovery-codes` | Recovery-Code-Status lesen | Bearer |
| `POST` | `/api/v1/tfa/recovery-codes/rotate` | Recovery-Codes ersetzen | Bearer |
| `POST` | `/api/v1/tfa/admin/users/:id/reset` | TFA-Zustand eines Nutzers zurücksetzen | Admin |
| `GET` | `/api/v1/gateways/tfa/adapters` | Registrierte Adapter auflisten | Admin |

## UI-Zuständigkeit

TFA-Browserassets liegen unter `src/gateways/tfa/ui/`. Das Gateway registriert seinen eigenen Einstellungsbereich, Administrationsbereich und statische Assets selbst. TOTP-spezifische Strings verbleiben beim TOTP-Adapter unter `src/adapters/tfa/totp/languages/`.

## Adapter-Vertrag

Jeder Adapter unter `src/adapters/tfa/<adapter-id>/` implementiert methodenspezifisches Setup und Verifikation. Gemeinsame Abläufe wie Recovery-Codes, Präferenzreihenfolge und globale Erzwingung bleiben im Gateway, damit neue Methoden ohne Richtlinien-Duplikate ergänzt werden können.
