# Gewählte Lernsprache Öffnen

**Feature-Zweig:** feature-study-selected-entry

## Direkter Explore-Einstieg

Beim Öffnen von `/study` erscheint direkt Explore für die ausgewählte verfügbare Sprache. Die Auswahl folgt der Study-Navigation: Eine bewusst ausgewählte registrierte Sprache bleibt auch ohne Lernanmeldung erhalten; andernfalls wird die erste verfügbare angemeldete Sprache verwendet. Ohne gültige Auswahl oder Anmeldung öffnet sich online die Sprachauswahl. Ein fehlender Katalog oder Explore-Anbieter führt zur bestehenden Nicht-verfügbar-Seite. Fehlende Offline-Metadaten zeigen die leere Study-Seite im Page Composer.

## Navigation Und Leitfäden

Der Ablauf `study:navigation:enter` enthält die Stufen `resolve` und `navigate`. Er verwendet das gemeinsame Study-Navigationsmodell und Anbieterschemata und ruft anschließend `ui:navigate` mit ersetztem Verlaufseintrag und aufgelöster Sprache auf. Direkte Links zu Inhalten, Kartensätzen, Library und anderen Study-Seiten bleiben erhalten. Ausstehende Auflösungen werden beim Seitenwechsel, Abbruch oder Entfernen des Anbieters verworfen; Änderungen an Anmeldung oder Anbietern lösen eine neue Auflösung aus. Zugriffsverweigerungen werden weitergegeben, Navigationsabbrüche respektiert und während des Wartens erscheint kein Sprachverzeichnis.

Das frühere, ausschließlich zum Sprachverzeichnis gehörende Anleitungsziel `modules` entfällt. Externe Leitfäden müssen die aktuelle Navigation oder eigene Inhalte statt des entfernten Verzeichnisses verwenden.

## Commits

- [3088b0d2c7b37b425e4fd0411de6a48ef7d9236c](https://github.com/Cognis-Labs-HQ/Cognis/commit/3088b0d2c7b37b425e4fd0411de6a48ef7d9236c)
