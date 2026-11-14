# Textauswahl im Chat erhalten

**Feature-Zweig:** feature-message-selection-recovered

## Auswahl bei Live-Aktualisierungen erhalten

Unveränderte Nachrichtentexte behalten ihre DOM-Knoten, wenn Nachrichten, Reaktionen oder Lesemetadaten geändert werden. Vorwärts- und Rückwärtsauswahl sowie die Auswahl über benachbarte Nachrichten bleiben am selben Text. Geänderter oder gelöschter ausgewählter Text folgt den nativen Auswahlregeln.

## Geladenen Verlauf und Reaktionszustand erhalten

Live-Aktualisierungen und frühere Nachrichten werden ohne Verlust geladener Zeilen zusammengeführt. Vorgemerkte Nachrichten zählen nicht zur Server-Paginierung. Bestätigte ältere Reaktionen werden sofort angezeigt und ihre vorhandene Seite wird aktualisiert; fehlgeschlagene Abfragen wiederholen keine Änderungen.

Späte Live- oder Verlaufsantworten behalten die neuere Projektion vorgemerkter Nachrichten bei, auch nachdem ausstehende Einträge verworfen oder bestätigt wurden. Unveränderte Abfragen aktualisieren die Zuständigkeit für den Stand; verworfene Projektionen machen zwischengespeicherte Signaturen ungültig. Fehlgeschlagene Reaktionsaktualisierungen erhalten den bestätigten Zustand und die Auswahl bei neuen und älteren Nachrichten.

Ältere Antworten zur neuesten Seite ersetzen keine neuere Anzeige mehr, einschließlich bestätigter vorgemerkter Nachrichten, Metadaten und Anfragestatus. Ausdrückliche Verlaufsabfragen werden weiterhin zusammengeführt. Veraltete Lesefehler erhalten neuere sichtbare Inhalte.

Überlappende Verlaufsabfragen verwenden dieselbe ansichtsgebundene Reihenfolge wie bestätigte Reaktionen. Neuere Zeilenmetadaten und bestätigte Löschungen bleiben bei älteren Ergebnissen erhalten. Überholte nachfolgende Lesefehler bleiben stumm; aktuelle Lese- und Änderungsfehler bleiben sichtbar. Abdeckungsbereiche werden relativ zu laufenden Abfragen zusammengeführt und nach deren Ende freigegeben; Zeitstempelgrenzen bleiben konservativ.

Zwischengespeicherte und bereits laufende geteilte Antworten erhalten keine neue Serverautorität. Sie behalten bekannte Zeilen und ergänzen fehlenden älteren Verlauf, ohne einen live bestätigten vollständigen Anfang wiederherzustellen. Bestätigungsreihenfolge und Live-Lesebelege werden bei der Paginierung getrennt. Quellenbezogene Signaturen erlauben späteren frischen Abfragen den Abgleich identischer Nutzdaten. Regressionstests prüfen Offline-Rückfall, geteilte Abfragen vor einer Bestätigung, beide Abschlussreihenfolgen, monotone unveränderte Abfragen und Grenzen bei angehaltenen Lesevorgängen.

Überholte Ansichtsergebnisse bleiben bei allen Aufrufern des Renderers von aktuellen Lesefehlern getrennt. Erfolgreiche oder fehlgeschlagene alte Abschlüsse nach einem Stil-, Schlüssel- oder Containerwechsel im selben Raum zeigen keine veralteten Aktionsfehler und starten keine Lesestatus- oder Tippstatusfolgeaktionen.

## Verhalten im echten DOM prüfen

Messages 2.7.43 ergänzt exakt festgelegte jsdom-Tests über den exportierten Renderer und die Offline-Client-Verträge. Der lokalisierte Verlaufsleitfaden erklärt Auswahl und frühere Nachrichten. Geometrieprüfungen betreffen Scroll-Regeln, nicht Browserpixel oder Zwischenablage.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/8d9e3fb8580353271b7ced5570aa2199bbc3c5fa
