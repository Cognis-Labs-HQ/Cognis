# Benachrichtigungs-Gateway

## Überblick

Das Benachrichtigungs-Gateway vermittelt Benachrichtigungen über pluggable Sender-Adapter. Es fungiert als Broker zwischen dem Rest der Anwendung und den konkreten Übertragungsmechanismen — SMTP, zukünftige Webhooks oder In-App-Senken — ohne zu wissen, welche Transporte konfiguriert sind.

Das Gateway besitzt auch zwei spezialisierte Dienste: `TfaCodeService` für die Ausstellung und Validierung von Zwei-Faktor-Authentifizierungscodes und `VerifyTokenService` für E-Mail-Verifizierungsabläufe. Sender-Adapter werden durch Scannen von `src/adapters/notify/` beim Bootstrap entdeckt. Der SMTP-Adapter ist der einzige eingebaute Sender; er aktiviert sich automatisch, wenn `COGNIS_SMTP_HOST` gesetzt ist.

## Verantwortlichkeiten

- Benachrichtigungs-Sender-Adapter aus `src/adapters/notify/` beim Bootstrap entdecken und registrieren.
- Benachrichtigungsumschläge an alle für Empfänger und Kategorie aktivierten Sender versenden.
- Sender-Konfigurationen aus der Datenbank persistieren und laden.
- Die `system`-Benachrichtigungskategorie registrieren.
- TFA-Code-Ausstellung und -Verifizierungsrouten verdrahten.
- E-Mail-Verifizierungstoken-Routen verdrahten.
- Adapter-Admin-Routen für die Konfiguration und das Testen von Sendern registrieren.

## Architektur

Die zentrale Klasse ist `CoreNotificationGateway` in `src/gateways/notify/gateway.ts`.

```ts
export interface NotificationGateway {
    registerSender(sender: NotificationSender): void;
    dispatch(envelope: NotificationEnvelope): Promise<{ dispatched: string[] }>;
    registerCategory(id: string, label: string): void;
    listSenders(): NotificationSenderInfo[];
    listCategories(): NotificationCategory[];
}
```

| Pfad                                          | Zweck                                     |
| --------------------------------------------- | ----------------------------------------- |
| `src/gateways/notify/gateway.ts`              | `CoreNotificationGateway`, Schnittstellen |
| `src/gateways/notify/bootstrap.ts`            | Bootstrap-Einstiegspunkt                  |
| `src/gateways/notify/routes/notifications.ts` | Versand- und Verwaltungsrouten            |
| `src/api/reuse/tfa-code.ts`                   | `TfaCodeService`                          |
| `src/api/reuse/verify-token.ts`               | `VerifyTokenService`                      |

## API-Routen

| Methode | Pfad                                        | Beschreibung                                        | Authentifizierung |
| ------- | ------------------------------------------- | --------------------------------------------------- | ----------------- |
| `POST`  | `/api/v1/notify/send`                       | Benachrichtigung versenden                          | Admin             |
| `GET`   | `/api/v1/notify/providers`                  | Registrierte Sender auflisten                       | Benutzer          |
| `GET`   | `/api/v1/notify/categories`                 | Benachrichtigungskategorien auflisten               | Bearer            |
| `GET`   | `/api/v1/notify/preferences`                | Eigene Benachrichtigungseinstellungen abrufen       | Bearer            |
| `PUT`   | `/api/v1/notify/preferences`                | Eigene Benachrichtigungseinstellungen aktualisieren | Bearer            |
| `POST`  | `/api/v1/notify/providers/:senderId/config` | Sender-Konfiguration aktualisieren                  | Admin             |
| `POST`  | `/api/v1/notify/providers/:senderId/test`   | Test-Benachrichtigung senden                        | Admin             |
| `POST`  | `/api/v1/users/tfa/request`                 | TFA-Code anfordern                                  | Bearer            |
| `POST`  | `/api/v1/users/tfa/verify`                  | TFA-Code verifizieren                               | Bearer            |
| `POST`  | `/api/v1/users/email/verify/request`        | E-Mail-Verifizierung anfordern                      | Bearer            |
| `POST`  | `/api/v1/users/email/verify`                | E-Mail-Verifizierung abschließen                    | Bearer            |
| `GET`   | `/api/v1/users/:username/email`             | Primäre E-Mail-Adresse eines Benutzers abrufen      | Bearer            |
| `PUT`   | `/api/v1/users/:username/email`             | Primäre E-Mail-Adresse eines Benutzers setzen       | Bearer            |
