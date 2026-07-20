# CLI-Komponenten

## CLI-Erkennung

Die CLI erkennt Befehls-Plugins jetzt aus Modulen, Gateways und Adaptern, einschließlich der in Manifesten deklarierten CLI-Einstiegspunkte, und gibt dynamisch registrierte Befehle standardmäßig formatiert aus.

## Komponentensteuerung

`component:list` zeigt jetzt Module, Gateways und Adapter nach Komponententyp an. Der GitHub-Importbefehl heißt nun `component:import`, und Adapter-Konfiguration sowie Tests sind über `component:config:get`, `component:config:set` und `component:test` erreichbar.
