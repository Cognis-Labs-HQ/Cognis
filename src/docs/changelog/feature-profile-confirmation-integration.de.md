# Profilbestätigungen

**Feature-Zweig:** feature-profile-confirmation-integration

## Profilaktionen bestätigen

Löschen, Entfolgen und Blockieren verwenden jetzt destruktive Bestätigungsschaltflächen und ein neutrales Abbrechen, das Inhalt oder Beziehung beibehält. Entsperren ist neutral. Wiederholte Aktionen teilen eine ausstehende Entscheidung und Anfrage. Navigation, Konto- oder Sitzungswechsel und Anbieterentfernung entziehen alten Bedienelementen ihre Wirkung.

## Klare Fehlerrückmeldung

Abgelehnte und nachweislich ungesendete Aktionen zeigen einen Fehler und erlauben eine neue Bestätigung. Ungewisse Übertragungen werden auf der aktuellen Seite nicht wiederholt; öffnen Sie das Profil erneut, um das Ergebnis zu prüfen. Angenommene Änderungen bleiben angenommen, wenn die anschließende Aktualisierung fehlschlägt.

## Gemeinsamer Pufferabbruch

Ein Seitenabbruch erreicht jetzt die gemeinsamen Anfrage- und Puffergrenzen vor der Übermittlung. Die optionalen Signalverträge für Übertragung und Ausgangswarteschlange erhalten angenommene Einträge, bestehende Aufrufe ohne Signal und Wiederholungen. Liefern Sie die gemeinsamen UI-Dateien mit Profile 4.0.1 aus.

## Commits

- [447e2ef705547e9e4f42ead1ef49574752b80c10](https://github.com/Cognis-Labs-HQ/Cognis/commit/447e2ef705547e9e4f42ead1ef49574752b80c10)
- [cc32cb6dd56ee033cdcb869d405ee2cb479d6611](https://github.com/Cognis-Labs-HQ/Cognis/commit/cc32cb6dd56ee033cdcb869d405ee2cb479d6611)
