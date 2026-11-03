# Geführte Tutorials

**Feature Branch:** feature-guided-tutorials-stacked

Anleitungen gehören zu einer Seite oder URL. Beim ersten zulässigen Besuch starten die noch nicht abgeschlossenen Anleitungen automatisch. Ein Fragezeichen-SVG neben dem Titel in `page-context` wiederholt die verfügbaren Anleitungen dieser Seite. Der Host besitzt Darstellung und Lebenszyklus; die Funktion besitzt Texte, Ziele und Skript. Berechtigungen werden nie geändert.

Der Host verwaltet Darstellung, Barrierefreiheit, Ereignissperren, Zielauflösung und Lebenszyklusbereinigung. Beispiele für Arbeitsbereich und Lernen liegen in ihren zuständigen Komponenten. Externe Module registrieren Abläufe und Ziele über ctx, ohne interne Host-Implementierungen zu importieren. Tests prüfen registrierte Flows, fehlende und ersetzte Ziele, asynchronen Abbruch, Berechtigungen, Anbieter-Rollback und veraltete Handles. Native Chromium-Prüfungen decken Fokus, Scrollen, Zoom, Tastatur- und Berührungssperren, Barrierefreiheitsrollen, reduzierte Bewegung und beide Farbschemata ab.

## Seitenbindung und erster Besuch

Alle Aktionsbuttons stehen in einer eigenen Instanz des gemeinsamen schwebenden Menüs. Erstdurchläufe haben weder Abbrechen noch Überspringen; Escape beendet sie nicht. Weiter bleibt während Zielsuche, asynchroner Arbeit und ereignisgesteuerter Schritte verfügbar, sodass wiederholtes Weiter immer zum Ende führt. Wiederholungen bieten Abbrechen mit `btn-cancel`. Andere Navigation, Verlauf, Konto- oder Berechtigungsverlust, entfernte Anbieter und Pflichtdialoge räumen weiterhin jede Sitzung auf. Anleitungen bestätigen keine Dialoge, senden keine privilegierten Formulare und starten keine Anrufe.

## Komponenteneigene Anleitungen

Seiten übergeben verfasste Beiträge im Composer-Feld `tutorials`. Jeder Beitrag erklärt Besitzer, Definitionen und optional `minRole`; jede Definition liefert Seite, übersetzte Texte und komponenteneigene Selektoren. `scope` beschränkt die Erkennung auf einen sichtbaren Bereich. Der Host veröffentlicht begrenzte Ziele und registriert über `ui:tutorial:mountPage`. Beim Entfernen der Seite werden ihre Anleitungen bereinigt. Optionale Anbieter können `mountTutorialProvider` aus `ui:reuse` verwenden und Übersetzungen sowie Lebenszyklus selbst besitzen.

## Übersetzungsschlüssel

Anleitungsschlüssel behalten die Modul-ID des Manifests als ein Namensraumsegment bei. Allgemeine Bezeichnungen für Navigation und Suche stammen aus dem gemeinsamen Katalog. Fehlgeschlagene Seiteneinrichtung entfernt alle Anleitungen, damit die Seite erneut geladen werden kann.

## Commits

- [5f3bad1422cd47085170ba2c5e4d06ca118c05fe](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f3bad1422cd47085170ba2c5e4d06ca118c05fe)
- [a2d973028](https://github.com/Cognis-Labs-HQ/Cognis/commit/a2d973028ba72dcdeb296c1346b9a893ccf7a84b)
- [73d206f](https://github.com/Cognis-Labs-HQ/Cognis/commit/73d206f37913e3cf6d8a7fcf8eed31c383f811f4)
