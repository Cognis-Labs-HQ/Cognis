# SMTP-TFA-Adapter

## Überblick

Der SMTP-TFA-Adapter ergänzt das TFA-Gateway um E-Mail-Codes als zweiten Faktor. Für Einrichtung und Anmeldung sendet er Einmalcodes an die primäre E-Mail-Adresse des Nutzers, wobei der Verifizierungs-E-Mail-Fluss des Notification-Gateways genutzt wird.

## Voraussetzungen

- Das Notification-Gateway muss den Versand von Verifizierungs-E-Mails bereitstellen.
- Der SMTP-Sender muss in der Administration des Notification-Gateways konfiguriert und aktiviert sein.
- Das Benutzerkonto muss eine verifizierte primäre E-Mail-Adresse haben.

## Konfiguration

- `codeLength` (Zahl, optional): Länge der generierten numerischen Codes. Werte werden auf 4–10 Stellen begrenzt.

## Laufzeitverhalten

- Challenge-Codes werden im Prozessspeicher gespeichert. Ein Neustart der App macht ausstehende Setup-/Login-Codes ungültig.
- In Multi-Instanz-Deployments sollte dieser Adapter nur verwendet werden, wenn Anfragen während eines Challenge-Fensters an dieselbe Instanz gebunden bleiben.
