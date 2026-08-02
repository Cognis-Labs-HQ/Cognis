# Zuverlässige Kalenderfreigaben

## Einladungen und Antworten funktionieren zuverlässig

Über beschreibbare freigegebene Kalender erstellte Termine umfassen nun alle Freigabeempfänger, verknüpfen Benachrichtigungen mit deren Kalendern und erlauben Empfängern mit Lesezugriff, direkt in der freigegebenen Ansicht zu antworten.

## Erneutes Freigeben erhält den Zugriff

Eine erneute Kalenderfreigabe für einen vorhandenen Empfänger setzt Schreibberechtigung und Ablaufzeit nicht mehr zurück.

## Quelldateien erfüllen Architekturgrenzen

Kalender-, Besprechungs- und Whiteboard-Quelldateien wurden ohne Verhaltensänderungen unter die vorgegebene Größenbegrenzung gebracht.

## Freigabefenster wird erfolgreich geladen

Das Linkfreigabefenster lädt seine API-Rückrufe jetzt über den registrierten statischen Pfad des Freigabe-Gateways, anstatt eine fehlende adapterlokale Datei anzufordern.

## Anmeldung verwirft Schlüsselbund-Entsperrung

Nach einer Kontoanmeldung wird jeder Entsperrschlüssel der Browsersitzung verworfen. Schlüsselbunde mit eigenem Passwort bleiben gesperrt, bis dieses lokal eingegeben wird; bei gewöhnlichen Seitenaktualisierungen kann eine ausdrücklich entsperrte Sitzung erhalten bleiben.

## Chats entsperren vor der Schlüsselwiederherstellung

Beim Öffnen einer Unterhaltung wird nun zuerst der lokale Schlüsselbund geprüft und entsperrt, bevor ein fehlender Raumschlüssel angefordert wird. Raummetadaten verteilen keine Schlüssel mehr; eine ausdrückliche, authentifizierte Raumeintrittsanfrage stellt einen Schlüssel erst wieder her, nachdem der entsperrte Schlüsselbund ihn als fehlend gemeldet hat.

## Zerstören entfernt jeden lokalen Schlüssel

Beim Zerstören eines Schlüsselbunds werden nun ausstehende Speichervorgänge abgewartet, die lokale Hülle und der Sitzungsschlüssel entfernt sowie Schlüsselzwischenspeicher der Komponenten ungültig gemacht, bevor der Ersatzspeicher erstellt wird. Die zerstörerische Bestätigung verwendet die Abbruchdarstellung, während der sichere Abbruch die Bestätigungsdarstellung nutzt.

## Einmalige Geheimniszustellung und synchronisierte Chatvorschauen

Erstellung und Zerstörung des Schlüsselbunds verwenden nun getrennte Erfolgs- und Warnmeldungen. Chatvorschauen werden aktualisiert, sobald ein Raumschlüssel in den Schlüsselbund gelangt, und der Server protokolliert die Raumschlüsselzustellung pro Mitglied, sodass ein authentifiziertes Mitglied einen erzeugten Raumschlüssel nur einmal erhalten kann; ein verlorener Schlüssel muss manuell oder durch eine neue Teilnehmereinladung bereitgestellt werden. Besprechungspasswörter sind im Ruhezustand verschlüsselt und werden jedem eingeladenen Teilnehmer ebenfalls nur beim ersten Beitritt zugestellt.
