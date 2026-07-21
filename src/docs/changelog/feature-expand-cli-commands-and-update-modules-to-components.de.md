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

`component:list` zeigt jetzt Module, Gateways und Adapter nach Komponententyp an. Der GitHub-Importbefehl heißt nun `component:import`, und Adapter-Konfiguration ist über `component:config:get` und `component:config:set` erreichbar.

## Bereinigung der Komponenten-Gesundheit

Redundante `gateway:*`- und `component:health`-CLI-Oberflächen wurden entfernt, Komponentenstatus bleibt unter `system:health`, TFA-CLI-Steuerungen wurden auf bereits konfigurierte Nutzermethoden sowie Recovery- und Erzwingungsfunktionen begrenzt, und der Komponentenstatus erscheint in den Administrationsdetails.

## Explizite CLI-Ziele

Das CLI-Bootstrap-Token verwendet jetzt ein System-Subjekt statt einer normalen Nutzeridentität. TFA- und Kalenderbefehle, die nutzereigene Daten lesen oder erstellen, verlangen einen expliziten Nutzernamen, damit `cognisctl` keine Standardkalender, TFA-Einträge oder andere nutzerbezogene Zustände für sich selbst anlegt.
