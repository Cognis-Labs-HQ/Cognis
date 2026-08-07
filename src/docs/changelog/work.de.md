# Öffentlichen Host verlangen

## Compose verlangt die Bereitstellungs-URL

Das Anwendungsabbild gibt localhost nicht mehr als öffentlichen Host vor. Beide Datenbankprofile für Compose verlangen `EXTERNAL_HOST`, damit Authentifizierungs-, Einladungs- und Benachrichtigungslinks nicht auf den lokalen Rechner des jeweiligen Empfängers verweisen.
