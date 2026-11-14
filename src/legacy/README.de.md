# Migrationen für Altbestände

Dieses Verzeichnis ist der einzige Ort für komponentenübergreifende Aktualisierungstransformationen von veralteten gespeicherten Formaten zu aktuellen Cognis-Verträgen. Laufzeitkompatibilität gehört weder hierher noch an eine andere Stelle der Anwendung.

Jede Migration muss unidirektional und idempotent sein, darf nur vom Startmigrationsprogramm aufgerufen werden und muss die letzte benötigte Quellversion sowie die Bedingung für ihre Löschung dokumentieren. Request-Handler, Gateways, Adapter, Module und Browsercode dürfen nur das aktuelle Format verwenden und dieses Verzeichnis niemals importieren.

Komponenteneigene Datenbankmigrationen verbleiben bei ihrer Komponente unter `sql/migrate/`. Verschieben Sie die Schemahoheit nicht in dieses Verzeichnis.
