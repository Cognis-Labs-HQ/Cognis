# Geführte Tutorials

**Feature Branch:** feature-guided-tutorials-stacked

Das Kontomenü öffnet den Tutorial-Katalog. Komponenten und aktivierte externe Module steuern über `ui:tutorials` übersetzte, wiederholbare Abläufe bei. Abläufe verwenden semantische Ziele, geschützte SPA-Navigation und abbrechbare Schritte; ein erforderlicher Dialog hat immer Vorrang. Siehe [Tutorial-Vertrag](/docs/tutorials).

Der Host verwaltet Darstellung, Barrierefreiheit, Ereignissperren, Zielauflösung und Lebenszyklusbereinigung. Beispiele für Arbeitsbereich und Lernen liegen in ihren zuständigen Komponenten. Externe Module registrieren Abläufe und Ziele über ctx, ohne interne Host-Implementierungen zu importieren. Tests prüfen registrierte Flows, fehlende und ersetzte Ziele, asynchronen Abbruch, Berechtigungen, Anbieter-Rollback und veraltete Handles. Native Chromium-Prüfungen decken Fokus, Scrollen, Zoom, Tastatur- und Berührungssperren, Barrierefreiheitsrollen, reduzierte Bewegung und beide Farbschemata ab.

## Commits

- [5669952](https://github.com/Cognis-Labs-HQ/Cognis/commit/5669952b50bfd854a678b8b077341d3200b4dca6)
