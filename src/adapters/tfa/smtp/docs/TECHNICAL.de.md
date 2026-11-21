# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von E-Mail-Bestätigung.

## Schnittstellen

Die TFA-Methode liefert Einrichtung und Prüfung und registriert ihren Zweck über notify:registerEmailPurpose. Versand nutzt notify:sendEmail und notify:emailDeliveryPolicy.

## Konfiguration

### Konfiguration

Die Codelänge wird beim E-Mail-Zustellanbieter konfiguriert; diese Methode liest dessen aktuelle Richtlinie.

## Verhalten

### Überblick

Der Adapter registriert seine eigene Code-Nachrichtenaktion beim Bootstrap über `notify:registerEmailPurpose` und sendet über `notify:sendEmail`. Registrierung, Nachrichteninhalt und Senderabgleich gehören diesem Adapter. Das TFA-Gateway stellt nur neutrale Adapter-Lebenszyklus-Hooks bereit. Beim Deaktivieren des Gateways wird die eigene SMTP-Warteschlange beendet; die Aktivierung stellt die Registrierung wieder her.

### Voraussetzungen

- Das Notification-Gateway muss den Versand von Verifizierungs-E-Mails bereitstellen.
- Der SMTP-Sender muss in der Administration des Notification-Gateways konfiguriert und aktiviert sein.
- Das Benutzerkonto muss eine verifizierte primäre E-Mail-Adresse haben.

### Laufzeitverhalten

- Challenge-Codes werden im Prozessspeicher gespeichert. Ein Neustart der App macht ausstehende Setup-/Login-Codes ungültig.
- In Multi-Instanz-Deployments sollte dieser Adapter nur verwendet werden, wenn Anfragen während eines Challenge-Fensters an dieselbe Instanz gebunden bleiben.

### Zustellrichtlinie

Codelänge und Versandintervall stammen aus `notify:emailDeliveryPolicy`. Der Adapter hat keine eigene Einstellung für die Codelänge. Gemeinsame Prüfhelfer erzeugen kryptografisch zufällige Ziffern; Darstellung und Sprachressourcen liefert diese Methode.

## Sicherheit

Prüfungen brauchen bestätigte Hauptadresse und Zustellung. Offene Codes sind prozesslokal und verfallen beim Neustart; Codes und Geheimnisse gehören nicht in Offline-Warteschlangen.

## Referenz

- [src/adapters/tfa/smtp/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/tfa/smtp/manifest.json)
- [src/adapters/tfa/smtp/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/tfa/smtp/package.json)
- [src/adapters/tfa/smtp/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/tfa/smtp/index.ts)
