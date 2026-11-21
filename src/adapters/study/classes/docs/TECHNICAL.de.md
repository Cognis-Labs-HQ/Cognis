# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Kurse.

## Schnittstellen

`GET /api/v1/study/classes`

`GET /api/v1/study/my-classes`

`GET /api/v1/study/available-classes`

`GET /api/v1/study/preferences`

`PUT /api/v1/study/preferences`

`POST /api/v1/study/teacher-requests`

`GET /api/v1/study/teacher-requests`

`POST /api/v1/study/teacher-requests/:id/approve`

`POST /api/v1/study/teacher-requests/:id/reject`

`POST /api/v1/study/classes/:classId/join`

`DELETE /api/v1/study/classes/:classId/membership`

`GET /api/v1/study/classrooms`

`PATCH /api/v1/study/classrooms/:classId/layout`

`DELETE /api/v1/study/classrooms/:classId/students/:studentId`

`GET /api/v1/study/classes/:classId/members`

`GET /api/v1/study/classes/:classId/join-requests`

`POST /api/v1/study/classes/:classId/invite`

`POST /api/v1/study/classes/:classId/join-requests/:studentId/approve`

`POST /api/v1/study/classes/:classId/join-requests/:studentId/reject`

## Konfiguration

Lernsprachen, Lehrberechtigungen, Mitgliedschaften und Raumgrenzen werden über Study und Kurse eingestellt. Es gibt keine eigene Datenbankverbindung.

## Verhalten

Lehrkräfte verwalten eigene Kurse und Mitgliedschaften. Lernende durchsuchen verfügbare Kurse, beantragen die Teilnahme und nutzen ihre Kursräume. Der Zustand wird über den Datenbankdienst gespeichert.

### Routen und Berechtigungen

Der Adapter registriert seine Routen und Persistenz über das Study-Gateway und ctx. Lehrkraftbezogene Routen erfordern die Rolle einer Lehrkraft; das Genehmigen und Ablehnen von Lehrkraftanfragen erfordert Administratorrechte. Änderungen an Mitgliedschaften und Klassenräumen behalten ihre konto- und klassenbezogenen Berechtigungsprüfungen.

### Bestätigte Kontolöschung

In `deprovision-user` → `cleanup-dependencies` löst die Komponente `auth:deprovisionOutcome` Version 1 über `system:contracts` auf und ruft `deletedAccount(input, stageResults)` mit den Originalobjekten desselben Aufrufs auf. Nur eine Auth-eigene Bestätigung der dauerhaft ausgeführten Löschung berechtigt dazu, Mitgliedschaften, Lehrkraftzuweisungen und Klassenraumaktivität des Kontos zu entfernen. Kopierte Ergebnisse, Deaktivierungs- oder Archivierungsergebnisse sowie fehlende oder nicht verfügbare Bestätigungen berechtigen nicht zu dieser Bereinigung.

Für die Bereitstellung ist der mitgelieferte Auth-Anbieter 2.2.12 oder eine Alternative erforderlich, die diesen versionierten Vertrag implementiert; veränderbare öffentliche Flow-Ergebnisse dienen nicht als Ersatz. Die Bereinigung verwendet die bestätigte Löschung, statt nach der Löschung erneut zu autorisieren. Eine bereits gestartete externe Änderung kann vor einem späteren Fehler teilweise abgeschlossen sein; ein komponentenübergreifendes Zurückrollen ist nicht garantiert. Bestehende Oberflächenbedienelemente und Tutorials bleiben unverändert.

Diese Umstellung schützt die Bereinigung durch die mitgelieferten Komponenten. Bevor die Kontolöschung in einer Bereitstellung aktiviert wird, müssen externe Bereinigungs-Hooks aktualisiert oder deaktiviert werden, die weiterhin veränderbaren öffentlichen Flow-Ergebnissen vertrauen.

## Sicherheit

Anmeldung, Eigentum und Kursmitgliedschaft werden pro Vorgang geprüft. Bei entsprechenden Lehr- oder Beitrittsregeln ist eine Verwaltungsfreigabe erforderlich.

## Referenz

### Technische Spezifikation

| Seite / Bereich            | Anleitung     | Zugriff             |
| -------------------------- | ------------- | ------------------- |
| `/classes` · `#class-list` | Kursanleitung | Angemeldeter Nutzer |
| `/my-classes`              | Meine Kurse   | Angemeldeter Nutzer |

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/adapters/social/messages/technical).
