# SMTP-TFA-Adapter

## Überblick

Der Adapter registriert seine eigene Code-Nachrichtenaktion beim Bootstrap über `notify:registerSmtpPurpose` und sendet über `notify:sendEmail`. Registrierung, Nachrichteninhalt und Senderabgleich gehören diesem Adapter. Das TFA-Gateway stellt nur neutrale Adapter-Lebenszyklus-Hooks bereit. Beim Deaktivieren des Gateways wird die eigene SMTP-Warteschlange beendet; die Aktivierung stellt die Registrierung wieder her.

## Voraussetzungen

- Das Notification-Gateway muss den Versand von Verifizierungs-E-Mails bereitstellen.
- Der SMTP-Sender muss in der Administration des Notification-Gateways konfiguriert und aktiviert sein.
- Das Benutzerkonto muss eine verifizierte primäre E-Mail-Adresse haben.

## Konfiguration

- `codeLength` (Zahl, optional): Länge der generierten numerischen Codes. Werte werden auf 4–10 Stellen begrenzt.

## Laufzeitverhalten

- Challenge-Codes werden im Prozessspeicher gespeichert. Ein Neustart der App macht ausstehende Setup-/Login-Codes ungültig.
- In Multi-Instanz-Deployments sollte dieser Adapter nur verwendet werden, wenn Anfragen während eines Challenge-Fensters an dieselbe Instanz gebunden bleiben.
