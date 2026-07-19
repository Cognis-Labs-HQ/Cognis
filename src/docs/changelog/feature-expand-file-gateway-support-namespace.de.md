# Härtung der Datei-Namespace-Review

## Kontingent-Verwaltungsrouten kollidieren nicht mehr mit Dateiobjekt-Routen

Das Files-Gateway registriert seine Kontingent-Verwaltungshandler jetzt vor dem Namespace-Objekt-Catch-all. Dadurch erreichen Anfragen an `/api/v1/files/admin/...` zuverlässig die Admin-Kontingent-API, statt als Datei in einem `admin`-Namespace interpretiert zu werden.

## Neue Benutzer erhalten Namespace-Kontingent-Schnappschüsse bei Neuinstallationen

Die Kontobereitstellung legt nun Standard-Kontingentzeilen für jeden registrierten Namespace an, bevor die Kontingente eines Benutzers als Schnappschuss gespeichert werden. So bleibt die Namespace-Kontingentdurchsetzung erhalten, selbst bevor ein Administrator die Standardwerte-Anzeige öffnet.

## Eingeschränkte Freigabelinks erzwingen Empfänger

Die Auflösung von Freigabe-Tokens prüft jetzt die Token-Empfänger, bevor Gastzugriff ausgegeben oder eine Nutzlast zurückgegeben wird. Empfängerbeschränkte Tokens verlangen, dass der Anfragende der Token-Besitzer oder ein benannter Benutzerempfänger ist, sodass beliebige Linkinhaber die Empfängerliste nicht umgehen können.

## Versionsdokumente bleiben lokalisiert

Die Komponenten-Versionsdokumente enthalten die Regeltexte jetzt konsistent übersetzt in allen unterstützten Sprachen.
