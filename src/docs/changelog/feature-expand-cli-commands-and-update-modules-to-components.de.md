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

`component:list` zeigt jetzt Module, Gateways und Adapter nach Komponententyp an. Der GitHub-Importbefehl heißt nun `component:import`, und Adapter-Konfiguration sowie Tests sind über `component:config:get`, `component:config:set` und `component:test` erreichbar.
