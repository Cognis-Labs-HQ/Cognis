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

## E-Mail-Verifizierung

SMTP-Verifizierung gilt für SSO-Konten und lokale Konten. Erneutes Senden verwendet den konfigurierten Benachrichtigungsdienst. Codes und Bestätigungslinks binden die vollständige Konto-ID und E-Mail als undurchsichtiges Tupel, einschließlich SSO-Namensräumen. Abbrechen der Verifizierung in den Einstellungen erhält die vorhandene E-Mail-Adresse.

## Gemeinsame obere Hinweise

Offline-Modus und Broadcast verwenden einen gemeinsamen fixierten Stapel ganz oben im Dokument über dem App-Kopf. Offline-Modus hat Vorrang, ist nicht schließbar und behält Verbindungsprüfung und Aktualisieren nach Wiederherstellung. Das Entfernen einer Ankündigung entfernt Offline-Modus nicht. Broadcast überspringt Netzwerkanfragen ohne Verbindung; sein Anbieter entfernt beim Beenden Leiste und Timer.

## Persönliche Offline-Optionen

Die bestätigte Anmeldung bereitet E-Mail-Liste und Richtlinie vertrauenswürdiger Domains ohne Besuch der Einstellungen vor. Hinzufügen, Entfernen und Auswahl der primären Adresse werden lokal dargestellt und über `notify:emailClient` sowie den geschützten Warteschlangeneigentümer `notify.emails` gespeichert. Die Serverprüfung bleibt maßgeblich. E-Mail-Verifizierung, erneutes Senden und Kontolöschung oder -deaktivierung benötigen eine Verbindung; Codes, Beobachtungstoken und Passwörter gelangen nicht in die Warteschlange. Neue Adressen bleiben bis zur Online-Verifizierung unbestätigt. Erfolgreiche Zustellung aktualisiert den E-Mail-Schnappschuss; optionale Aktualisierungsfehler machen gespeicherte Änderungen nicht nachträglich zu Fehlern. Die begrenzten privaten Schnappschüsse sind an Tab und Sitzung gebunden.

## Sitzungs- und Modulgrenzen

Die lebenszyklusgebundene Fähigkeit `notify:emailClient` bietet Anfragen für das eigene Konto und vertrauenswürdige Domänen sowie administrative E-Mail-Abfragen mit `listUserEmails`, erneuten Versand nur bei Verbindung mit `resendUserEmail` und `smtpAvailable`. Jede Aktion durchläuft registrierte Stufen und endet bei Entsorgung des Providers. Einstellungen, Benutzerverwaltung und Administration lösen diese Methoden über ctx auf, ohne Notify-UI-Implementierungen zu importieren. Fehlt Notify, wird die E-Mail-Verwaltung ausgeblendet; unabhängige Kontosteuerungen bleiben nutzbar.
