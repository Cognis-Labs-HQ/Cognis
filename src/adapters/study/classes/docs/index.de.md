# Klassen-Adapter

Der Klassen-Adapter verwaltet sprachbezogene Klassen, Mitgliedschaftsanfragen, Lehrkraftzuweisungen und Klassenraumeinstellungen.

## Verwendungsbeispiele

Lehrkräfte verwalten ihre Klassen unter `/classes`; angemeldete Lernende sehen ihre Mitgliedschaften unter `/my-classes`. `GET /api/v1/study/classes?language=ja` liefert die passenden Klassen der Lehrkraft, während `GET /api/v1/study/my-classes` die Klassen der angemeldeten lernenden Person liefert.

## Technische Spezifikation

### Routen und Berechtigungen

Der Adapter registriert seine Routen und Persistenz über das Study-Gateway und ctx. Lehrkraftbezogene Routen erfordern die Rolle einer Lehrkraft; das Genehmigen und Ablehnen von Lehrkraftanfragen erfordert Administratorrechte. Änderungen an Mitgliedschaften und Klassenräumen behalten ihre konto- und klassenbezogenen Berechtigungsprüfungen.

### Bestätigte Kontolöschung

In `deprovision-user` → `cleanup-dependencies` löst die Komponente `auth:deprovisionOutcome` Version 1 über `system:contracts` auf und ruft `deletedAccount(input, stageResults)` mit den Originalobjekten desselben Aufrufs auf. Nur eine Auth-eigene Bestätigung der dauerhaft ausgeführten Löschung berechtigt dazu, Mitgliedschaften, Lehrkraftzuweisungen und Klassenraumaktivität des Kontos zu entfernen. Kopierte Ergebnisse, Deaktivierungs- oder Archivierungsergebnisse sowie fehlende oder nicht verfügbare Bestätigungen berechtigen nicht zu dieser Bereinigung.

Für die Bereitstellung ist der mitgelieferte Auth-Anbieter 2.2.12 oder eine Alternative erforderlich, die diesen versionierten Vertrag implementiert; veränderbare öffentliche Flow-Ergebnisse dienen nicht als Ersatz. Die Bereinigung verwendet die bestätigte Löschung, statt nach der Löschung erneut zu autorisieren. Eine bereits gestartete externe Änderung kann vor einem späteren Fehler teilweise abgeschlossen sein; ein komponentenübergreifendes Zurückrollen ist nicht garantiert. Bestehende Oberflächenbedienelemente und Tutorials bleiben unverändert.

Diese Umstellung schützt die Bereinigung durch die mitgelieferten Komponenten. Bevor die Kontolöschung in einer Bereitstellung aktiviert wird, müssen externe Bereinigungs-Hooks aktualisiert oder deaktiviert werden, die weiterhin veränderbaren öffentlichen Flow-Ergebnissen vertrauen.
