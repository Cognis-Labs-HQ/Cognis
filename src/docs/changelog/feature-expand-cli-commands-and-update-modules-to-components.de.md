# Modul-CLI-Abdeckung

## Modul-API-Befehle ergänzt

Cognisctl-Befehle für Modul-Backend-Endpunkte ergänzt, die bisher direkte HTTP-Aufrufe erforderten, einschließlich Analytics-Aktivitätsansichten, Jitsi-Meet-Administration und Nextcloud-Whiteboard-Vorgängen.

## API-Bootstrap für Health-Beiträge behoben

Der API-Bootstrap nutzt jetzt denselben Health-Service wie der Server, damit Komponenten ihre Health-Beiträge registrieren können, ohne den Start zu unterbrechen.

# CLI-Abdeckung

## Betriebsbefehle

Die CLI enthält jetzt Befehle für TFA, Benachrichtigungen, E-Mail-Adressen, Einladungen, Kalender, Lernsprachen, Nachrichtenunterhaltungen und Freigaben, damit Administratoren mehr App-Funktionen über `cognisctl` erreichen können.

## Interaktiver Assistent

Befehle mit komplexen Nutzdaten können erforderliche Werte abfragen, wenn keine Argumente angegeben werden, sodass strukturierte API-Vorgänge leichter korrekt gesendet werden können.

# CLI-Komponenten

## CLI-Erkennung

Die CLI erkennt Befehls-Plugins jetzt aus Modulen, Gateways und Adaptern, einschließlich der in Manifesten deklarierten CLI-Einstiegspunkte, und gibt dynamisch registrierte Befehle standardmäßig formatiert aus.

## Komponentensteuerung

`component:list` zeigt jetzt Module, Gateways und Adapter nach Komponententyp an. Der GitHub-Importbefehl heißt nun `component:import`, und Modul-, Gateway- und Adapter-Konfiguration ist über `component:config:get` und `component:config:set` erreichbar.

## Bereinigung der Komponenten-Gesundheit

Redundante `gateway:*`- und `component:health`-CLI-Oberflächen wurden entfernt, Komponentenstatus bleibt unter `system:health`, TFA-CLI-Steuerungen wurden auf bereits konfigurierte Nutzermethoden sowie Recovery- und Erzwingungsfunktionen begrenzt, und der Komponentenstatus erscheint in den Administrationsdetails.

## Explizite CLI-Ziele

Das CLI-Bootstrap-Token verwendet jetzt ein System-Subjekt statt einer normalen Nutzeridentität. TFA- und Kalenderbefehle, die nutzereigene Daten lesen, verlangen einen expliziten Nutzernamen, damit `cognisctl` keine Standardkalender, TFA-Einträge oder andere nutzerbezogene Zustände für sich selbst anlegt.

## Administrativer CLI-Umfang

Kalender-, Social-, Nachrichten-, Freigabe- und Benachrichtigungs-Pluginbefehle konzentrieren sich jetzt auf Inspektion und administrative Wartung. Nutzerfluss-Mutationen wie das Erstellen von Kalenderereignissen, Ändern von Kalenderfreigaben, Senden von Nachrichten, Genehmigen von Nachrichtenanfragen sowie Erstellen oder Löschen von Social-Posts wurden aus `cognisctl` entfernt.

## CLI-Ausgabeformatierung

API-Fehler werden jetzt über einen gemeinsamen lesbaren Formatter ausgegeben, der Status, Code, Nachricht und Details aus Standard-Fehlerantworten hervorhebt. Dynamisch entdeckte Pluginbefehle, einschließlich Dateien, Analytics und Jitsi Meet, verwenden standardmäßig strukturierte Zusammenfassungen und Tabellen statt Roh-JSON.

## Einheitliche Komponenten-Konfiguration

Die Jitsi-Meet-Meetingprüfung nutzt jetzt `jitsi-meet:meetings`, und modulspezifische Konfigurationsbefehle wurden in `component:config:get` und `component:config:set` zusammengeführt, damit Module, Gateways mit Konfigurationsendpunkten und Adapter eine gemeinsame Konfigurationsoberfläche verwenden.

## Whiteboard- und Meeting-Prüfung

`nextcloud-whiteboard:whiteboards` nutzt jetzt die administratorweite Whiteboard-Liste statt eines profilgebundenen Benutzerkontexts, und aktive Jitsi-Meet-Zusammenfassungen zeigen eingeladene Teilnehmer getrennt von aktiven Teilnehmern.
