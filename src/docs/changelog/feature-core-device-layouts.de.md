# Gerätegerechte Ansichten

**Feature-Zweig:** feature-core-device-layouts

## Anpassbare Arbeitsflächen

Schmale Kalenderflächen zeigen eine Terminliste mit allen Ereignissen und dem gewählten Datum sowie einer kompakten Ansichts- und Datumsauswahl. Breite Flächen behalten Kalendergitter. Das Datumsfeld erreicht leere Tage ohne Scrollen durch einen Monat. Geteilte Kalender nutzen dieselben Darstellungen und beachten Nur-Lese-Rechte.

Messages passt Verlauf und Eingabe an den sichtbaren Bildschirmausschnitt an. Die gemeinsame Seitenleistenschaltfläche öffnet auf Telefonen und Tablets die Raumliste. Escape gibt den Fokus zurück, eine Auswahl schließt die Liste und Drehungen erhalten Entwürfe. Auf niedrigen Bildschirmen bleibt die Arbeitsfläche scrollbar, statt Bedienelemente abzuschneiden.

## Composer

Der Page Composer steuert die Auswahl der Darstellung. Jede Elementfunktion erhält einen unveränderlichen Kontext mit `compact`, `layout`, `drawer` und `touch`. Entscheidend ist die innere Breite der Karte, einschließlich Änderungen durch Seitenleisten oder verschachtelte Layouts. Mit `responsive: true` erhält ein Element bei einem Darstellungswechsel neues Markup; normale zustandsbehaftete Elemente behalten ihren DOM. `onResize(presentation)` dient Geometrieanpassungen. Seitencode benötigt keine eigenen Bildschirmabfragen oder Größenereignisse.

Desktop-Werkzeugleisten verwenden eine begrenzte gemeinsame Spalte, damit für Inhalte genügend Platz bleibt. Die Spalte berücksichtigt die gewählte Textgröße; Telefone und Tablets nutzen die Composer-Seitenleiste.

Die gemeinsamen `layout`-Werte sind `compact` (bis 640px), `medium` (bis 900px) und `regular`, gemessen innerhalb der Karte. Dichte Flächen wie der Kalender nutzen in beiden eingeschränkten Darstellungen die Terminliste.

Die vom Composer verwalteten Attribute `data-composer-layout`, `data-composer-drawer` und `data-composer-touch` steuern Layout und Eingabe. Normale und verschachtelte Komposition erhalten denselben Kontext. Der Composer überwacht Inhalt und Karten, stellt Formularwerte wieder her und entfernt Beobachter und Ereignisbehandlung beim Verlassen der Seite.

## Seiten und Seitenleisten

Über das Seitenraster im Hauptkopf wechselst du zu anderen Bereichen. Die kompakte Seitenauswahl hält den Tastaturfokus und schließt mit Escape. Page Composer stellt für alle Seitenleisten dieselbe SVG-Schaltfläche mit doppeltem Winkel oben links bereit. Messages öffnet damit die Unterhaltungen.

## Lesbare mobile Inhalte

Der Kalender hält die Bedienung über einer unabhängig scrollbaren Terminliste. Neben jedem Datum steht ein zugängliches Symbol zum Hinzufügen eines Ereignisses. Messages begrenzt lange Raumüberschriften auf zwei sichtbare Zeilen; der vollständige Titel bleibt zugänglich. Profile zeigen auf Telefonen und Tablets zuerst Identität, Beitragserstellung und Beiträge, danach weitere soziale Bereiche. Biografien und Beiträge brechen natürlich um.

`stackAt: "medium"` fordert bis zur gemeinsamen Tabletgrenze eine fließende einzelne Spalte an. `readingOrder` legt deren Elementreihenfolge fest, ohne gespeicherte Desktoplayouts zu ändern. Formularfelder und Entwürfe bleiben bei Layoutänderungen erhalten.

Studienkarten verwenden die gemeinsame Lesefläche. Der Dialog folgt der verfügbaren Breite, hält Überschrift sowie Zurück/Weiter sichtbar und scrollt lange Inhalte unabhängig. Tablet- und Touchflächen bleiben 44px groß; schmale Detailangaben stehen untereinander.

Kopf- und Fußzeile verwenden dieselbe Rahmenbreite. Ihre Außenkanten stimmen auf Telefonen, Tablets und Desktopbildschirmen überein.

Die Vorschau zeigt vor dem Veröffentlichen den aktuellen Titel und Text. Wechsle zurück zum Schreiben oder drehe das Gerät, ohne den Entwurf zu verlieren.

Veröffentlichte Beiträge erscheinen sofort; nach dem Löschen wird die Beitragsliste ohne Neuladen aktualisiert.

Elemente können einen stabilen Bereich mit `data-composer-header` deklarieren. Composer platziert dort seine Seitenleistenschaltfläche und erhält dieselbe Schaltfläche samt Fokusverhalten bei Neuzeichnungen. Asynchron ersetzte Inhalte gehören in ein Kindelement dieses Bereichs. `data-composer-sidebar-trigger` kennzeichnet die gemeinsame Schaltfläche für Stile. Kalender und Messages gewinnen dadurch mehr Höhe für Inhalte.

## Komponentenisolierung

Die Ansichtsgrößentests von Kalender und Nachrichten liegen bei ihren jeweiligen Komponenten. Browser-Testumgebungen stellen Komponentenressourcen ausdrücklich bereit und ersetzen externe Verträge durch Testimplementierungen. Prüfungen für gefüllte Ansichten, Entwürfe, Touch-Bedienelemente und die Ressourcenfreigabe bleiben erhalten. Nachrichten-Tutorials verwenden den öffentlichen Composer-Seitenleistenanker.

Composer deaktiviert die automatische Scroll-Verankerung des Browsers im gesamten Rasterinhalt, damit sich verschachtelte Scroll-Positionen bei Breitenänderungen nicht verschieben. Die Inhaltskomponenten steuern das Scrollen beim Anfügen oder Ersetzen von Inhalten.

## Commits

- [f4f6d3a84](https://github.com/Cognis-Labs-HQ/Cognis/commit/f4f6d3a84b587d4eb169b5db76b850956544ad31)
- [1ab4a71b2babcede98fe870eac78989dca014b38](https://github.com/Cognis-Labs-HQ/Cognis/commit/1ab4a71b2babcede98fe870eac78989dca014b38)
- [883db306dce10da3bf67b4fac29ca6c89f2ae5b9](https://github.com/Cognis-Labs-HQ/Cognis/commit/883db306dce10da3bf67b4fac29ca6c89f2ae5b9)
- [a0e4d976a436221c63c31eb622a55524de1b6bf0](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0e4d976a436221c63c31eb622a55524de1b6bf0)
