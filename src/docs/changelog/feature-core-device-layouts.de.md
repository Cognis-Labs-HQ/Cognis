# Gerätegerechte Ansichten

**Feature-Zweig:** feature-core-device-layouts

## Anpassbare Arbeitsflächen

Schmale Kalenderflächen zeigen eine Terminliste mit allen Ereignissen und dem gewählten Datum sowie einer kompakten Ansichts- und Datumsauswahl. Breite Flächen behalten Kalendergitter. Das Datumsfeld erreicht leere Tage ohne Scrollen durch einen Monat. Geteilte Kalender nutzen dieselben Darstellungen und beachten Nur-Lese-Rechte.

Messages passt Verlauf und Eingabe an den sichtbaren Bildschirmausschnitt an. Unterhaltungen öffnet auf Telefonen und Tablets die Raumliste. Escape gibt den Fokus zurück, eine Auswahl schließt die Liste und Drehungen erhalten Entwürfe. Auf niedrigen Bildschirmen bleibt die Arbeitsfläche scrollbar, statt Bedienelemente abzuschneiden.

## Composer

Der Page Composer steuert die Auswahl der Darstellung. Jede Elementfunktion erhält einen unveränderlichen Kontext mit `compact`, `layout`, `drawer` und `touch`. Entscheidend ist die innere Breite der Karte, einschließlich Änderungen durch Seitenleisten oder verschachtelte Layouts. Mit `responsive: true` erhält ein Element bei einem Darstellungswechsel neues Markup; normale zustandsbehaftete Elemente behalten ihren DOM. `onResize(presentation)` dient Geometrieanpassungen. Seitencode benötigt keine eigenen Bildschirmabfragen oder Größenereignisse.

Desktop-Werkzeugleisten verwenden eine begrenzte gemeinsame Spalte, damit für Inhalte genügend Platz bleibt. Die Spalte berücksichtigt die gewählte Textgröße; Telefone und Tablets nutzen die Composer-Seitenleiste.

Die gemeinsamen `layout`-Werte sind `compact` (bis 640px), `medium` (bis 900px) und `regular`, gemessen innerhalb der Karte. Dichte Flächen wie der Kalender nutzen in beiden eingeschränkten Darstellungen die Terminliste.

Die vom Composer verwalteten Attribute `data-composer-layout`, `data-composer-drawer` und `data-composer-touch` steuern Layout und Eingabe. Normale und verschachtelte Komposition erhalten denselben Kontext. Der Composer überwacht Inhalt und Karten, stellt Formularwerte wieder her und entfernt Beobachter und Ereignisbehandlung beim Verlassen der Seite.

## Commits

- [f4f6d3a84](https://github.com/Cognis-Labs-HQ/Cognis/commit/f4f6d3a84b587d4eb169b5db76b850956544ad31)
