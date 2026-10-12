# Schreibübung

Study besitzt das vollständige Schreibfeld in `src/gateways/study/ui/reuse/drawing.js`: Zeichenfläche, Steuerung, Hilfen, Bewertung und Ergebnis. Der optionale Zeichenadapter stellt `study:drawing:open` und `study:drawing:load` über Browser-`uiCtx` bereit. Aufrufer warten auf diese Aktionen und übergeben eine vollständige Bibliothekskarte mit geprüftem `strokePattern`.

## Anwendungsbeispiele

Dieselbe Engine `openDrawingPad` akzeptiert `container`, Abbruch-`signal` und `onResult`. Ohne Container öffnet sie ein verschiebbares, skalierbares Fenster innerhalb der Seite und behält beim Kartenwechsel die Position. Mit Container wird das ganze Schreibfeld eingebettet, das ursprüngliche Zeichen gesperrt und Erfolg erst nach allen korrekten Strichen gemeldet. Eingebettetes Schreiben benötigt keinen optionalen Zeichenadapter.

## Technische Spezifikation

Maus, Stift und Berührung werden nach Reihenfolge, Richtung und Nähe bewertet. Akzeptierte Striche werden durch Vorlagen ersetzt. Nummerierte Hilfen, fortschreitende Strichanzeige und Zeichengrenzen bleiben erhalten. Die Hilfe ist deaktiviert, solange alle Striche sichtbar sind. Zehn aufeinanderfolgende Fehler beenden den Versuch; das Ergebnis zeigt Fehlerzahl und Wiederholung. Gute Versuche erhöhen die Schwierigkeit im Arbeitsspeicher.

Zusammengesetzte Muster behalten Proportionen, Reihenfolge, Zeit, Druck und Zeigerposition ohne Anbieterinhalte zu verändern. Beschriftungen vermeiden Strichpfade. Die Anzeige wird höchstens einmal je Bild aktualisiert. Schwebende Fenster verwenden das normale Schließen-SVG, eingebettete Felder bleiben im Container. Eigene Stile verändern weder Composer noch Seitengerüst oder Seitenmenü.

Öffnen, Laden, Strich, Zurücksetzen, Hilfe, Wiederholung und Schließen führen deklarierte `study:drawing`-Abläufe mit before, execute und after aus. Navigation oder Abbruch beendet Ereignisse, Beobachter und Darstellung. Bibliothek und Lernkarten verwenden ausschließlich die öffentliche Study-Wiederverwendung.

Das gemeinsame Schreibfeld lädt seine eigene HTML-Vorlage einmal je Browsermodul. Fehlgeschlagene Anfragen lehnen die Öffnungsaktion ab; Navigation während des Ladens bricht die Einbindung ab. Zeichengruppen des Anbieters bleiben in Mehrzeichenmustern erhalten.
