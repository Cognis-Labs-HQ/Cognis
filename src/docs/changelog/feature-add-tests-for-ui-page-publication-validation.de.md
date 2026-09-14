# UI-Wiederverwendung erzwingen
**Feature-Zweig:** feature-add-tests-for-ui-page-publication-validation

## Seitenaufbau absichern
Automatisierte Architekturprüfungen weisen nun Seiten des Kerns und installierter externer Module zurück, die eine Einbindungsfunktion ohne den Cognis-Seitenkomponisten veröffentlichen.

## Wiederverwendbare Werkzeuge absichern
Externe Browsermodule dürfen keine Funktion mehr erneut deklarieren, die bereits über die Cognis-Oberfläche zur Wiederverwendung angeboten wird. Direkte Ausgaben in das Einbindungswurzelelement werden gemeinsam mit der fehlenden Komponistennutzung gemeldet.


## Formularaufbau absichern
Browsercode des Kerns und externer Module muss den Cognis-Formularersteller verwenden, sobald er ein Formular veröffentlicht oder eine Übermittlung verarbeitet. Der Ersteller unterstützt nun vertrauenswürdige komplexe Inhalte und validierte Formularattribute, damit individuelle Formulare die gemeinsame Umhüllung beibehalten.

## Anonyme Modulseiten veröffentlichen
Aktivierte Module können nun ausdrücklich eine öffentliche SPA-Route für Inhalte wie Nutzungsbedingungen registrieren. Anonyme Clients erhalten nur öffentliche Routenbeschreibungen, während authentifizierte Routen geschützt bleiben und öffentliche Routen den anonymen Zugriff nicht mit Rollenbeschränkungen kombinieren können.

## Commits
- [57d2cdca](https://github.com/Cognis-Labs-HQ/Cognis/commit/57d2cdca)
- [6ce9fafe](https://github.com/Cognis-Labs-HQ/Cognis/commit/6ce9fafe)
- [e0f8bc49](https://github.com/Cognis-Labs-HQ/Cognis/commit/e0f8bc49)
