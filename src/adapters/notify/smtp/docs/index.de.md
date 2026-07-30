# SMTP-Benachrichtigungsadapter

## Überblick

Der SMTP-Adapter liefert Benachrichtigungen als E-Mails über einen beliebigen SMTP-Server. Er ist der einzige eingebaute Benachrichtigungsadapter und aktiviert sich automatisch, wenn die Umgebungsvariable `COGNIS_SMTP_HOST` gesetzt ist. Typische Anwendungsfälle sind die Zustellung von Zwei-Faktor-Authentifizierungscodes, E-Mail-Verifizierungslinks und anderen Benachrichtigungskategorien.

Der Adapter implementiert Greylist-tolerante Zustellung: Bei einer vorübergehenden Ablehnung beim ersten Sendeversuch wird bis zu zweimal mit einer Verzögerung von fünf Minuten zwischen den Versuchen wiederholt.

## Verantwortlichkeiten

- E-Mails über den konfigurierten SMTP-Server mit Nodemailer senden.
- Vorübergehende Zustellungsfehler mit Wiederholungsversuchen behandeln (bis zu 2 Wiederholungen, 5-Minuten-Verzögerung).
- `getConfig()` und `setConfig()` für Laufzeit-Neukonfiguration über die Admin-API bereitstellen.
- `codeLength` (Zahl, optional): Gemeinsame Länge für SMTP-Verifizierungscodes, die für E-Mail-Bestätigung und SMTP-TFA-Codes verwendet wird. Werte werden auf 4–10 Stellen begrenzt und mit dem SMTP-TFA-Adapter synchronisiert.
- `sendTestEmail(to)` zur Zustellungsüberprüfung bereitstellen.

## Konfiguration

| Variable             | Standard | Beschreibung                                                      |
| -------------------- | -------- | ----------------------------------------------------------------- |
| `COGNIS_SMTP_HOST`   | —        | SMTP-Server-Hostname; der Adapter ist inaktiv, wenn nicht gesetzt |
| `COGNIS_SMTP_PORT`   | `587`    | SMTP-Server-Port                                                  |
| `COGNIS_SMTP_SECURE` | `false`  | `true` für TLS beim Verbinden (Port 465)                          |
| `COGNIS_SMTP_USER`   | —        | SMTP-Authentifizierungsbenutzername                               |
| `COGNIS_SMTP_PASS`   | —        | SMTP-Authentifizierungspasswort                                   |
| `COGNIS_SMTP_FROM`   | —        | Absenderadresse im `From`-Header                                  |

## Testzustellung

Testnachrichten verwenden dieselbe adaptereigene Warteschlange und empfängerbezogene Ratenbegrenzung wie der reguläre SMTP-Versand. Die übermittelte Konfiguration bleibt beim eingereihten Test, und die API wartet auf das endgültige Zustellergebnis.
