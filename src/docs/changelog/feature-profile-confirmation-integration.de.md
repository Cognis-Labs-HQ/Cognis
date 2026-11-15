# Profilbestätigungen

**Feature-Zweig:** feature-profile-confirmation-integration

## Profilaktionen bestätigen

Löschen, Entfolgen und Blockieren verwenden jetzt destruktive Bestätigungsschaltflächen und ein neutrales Abbrechen, das Inhalt oder Beziehung beibehält. Entsperren ist neutral. Wiederholte Aktionen teilen eine ausstehende Entscheidung und Anfrage. Navigation, Konto- oder Sitzungswechsel und Anbieterentfernung entziehen alten Bedienelementen ihre Wirkung.

## Klare Fehlerrückmeldung

Abgelehnte und nachweislich ungesendete Aktionen zeigen einen Fehler und erlauben eine neue Bestätigung. Ungewisse Übertragungen werden auf der aktuellen Seite nicht wiederholt; öffnen Sie das Profil erneut, um das Ergebnis zu prüfen. Angenommene Änderungen bleiben angenommen, wenn die anschließende Aktualisierung fehlschlägt.

## Gemeinsamer Pufferabbruch

Ein Seitenabbruch erreicht jetzt die gemeinsamen Anfrage- und Puffergrenzen vor der Übermittlung. Die optionalen Signalverträge für Übertragung und Ausgangswarteschlange erhalten angenommene Einträge, bestehende Aufrufe ohne Signal und Wiederholungen. Liefern Sie die gemeinsamen UI-Dateien mit Profile 4.0.1 aus.

## Commits

- [ba47b044fa05c39695814c073c60890075b16cbe](https://github.com/Cognis-Labs-HQ/Cognis/commit/ba47b044fa05c39695814c073c60890075b16cbe)
- [e99a5c36fa180248c9909c44bf4b012324a9b3aa](https://github.com/Cognis-Labs-HQ/Cognis/commit/e99a5c36fa180248c9909c44bf4b012324a9b3aa)
