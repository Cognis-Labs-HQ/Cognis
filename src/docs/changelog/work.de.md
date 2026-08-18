# Seiten installierter Module wiederherstellen

## UI-Routen externer Module aus ihrem Installationsverzeichnis laden

Installierte Module werden jetzt anhand ihrer stabilen UUID im Verzeichnis für externe Module aufgelöst. Ihre deklarierten Seiten und Navigationseinträge werden beim Start automatisch geladen, anstatt im Pfad der mitgelieferten Module gesucht zu werden.

## Modulstart vor Anfragen abschließen

Cognis wartet jetzt, bis gespeicherte Modulzustände wiederhergestellt und Module vollständig gestartet wurden, bevor eine Anfrage verarbeitet wird. Skripte und Styles externer Module sind dadurch registriert, bevor ihre Seiten sie anfordern.

## Authentifizierungsfunktionen bereitstellen

Das Authentifizierungs-Gateway veröffentlicht jetzt seine Funktionen zur Anfrageauthentifizierung und Rollenprüfung über den Capability-Bus. Externe Module können geschützte API-Routen ohne Importe aus Gateway-Interna starten, sodass ihre UI-Ressourcen und Navigationseinträge aktiv bleiben.
