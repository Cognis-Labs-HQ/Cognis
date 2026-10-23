# Schreibübung

Study besitzt das vollständige Schreibfeld in `src/gateways/study/ui/reuse/drawing.js`: Zeichenfläche, Steuerung, Hilfen, Bewertung und Ergebnis. Der optionale Zeichenadapter stellt `study:drawing:open` und `study:drawing:load` über Browser-`uiCtx` bereit. Aufrufer warten auf diese Aktionen und übergeben eine vollständige Bibliothekskarte mit geprüftem `strokePattern`.

## Anwendungsbeispiele

Dieselbe Engine `openDrawingPad` akzeptiert `container`, Abbruch-`signal` und `onResult`. Ohne Container öffnet sie ein verschiebbares, skalierbares Fenster innerhalb der Seite und behält beim Kartenwechsel die Position. Mit Container wird das ganze Schreibfeld eingebettet, das ursprüngliche Zeichen gesperrt und Erfolg erst nach allen korrekten Strichen gemeldet. Eingebettetes Schreiben benötigt keinen optionalen Zeichenadapter.

## Technische Spezifikation

Maus, Stift und Berührung werden nach Reihenfolge, Richtung und Nähe bewertet. Akzeptierte Striche werden durch Vorlagen ersetzt. Vor der ersten Eingabe zeigt ein für das aktuelle Konto noch nicht abgeschlossenes Muster alle nummerierten Striche. Danach und bei bereits abgeschlossenen Mustern wird über Zeichengrenzen hinweg nur der nächste Strich geführt. Die Hilfe ist deaktiviert, solange alle Striche sichtbar sind. Zehn aufeinanderfolgende Fehler beenden den Versuch; das Ergebnis zeigt Fehlerzahl und Wiederholung. Abschluss und Anzahl ausgeblendeter Striche werden je Konto und Karte gespeichert. Ein Abschluss mit höchstens einem Fehler erhöht die Anzahl bis zur aktuellen Strichzahl. Jeder Versuch, jedes Zurücksetzen und jede Wiederholung wählt neue zufällige Positionen.

Zusammengesetzte Muster behalten Proportionen, Reihenfolge, Zeit, Druck und Zeigerposition ohne Anbieterinhalte zu verändern. Beschriftungen vermeiden Strichpfade. Die Anzeige wird höchstens einmal je Bild aktualisiert. Schwebende Fenster verwenden das normale Schließen-SVG, eingebettete Felder bleiben im Container. Eigene Stile verändern weder Composer noch Seitengerüst oder Seitenmenü.

Öffnen, Laden, Strich, Zurücksetzen, Hilfe, Wiederholung und Schließen führen deklarierte `study:drawing`-Abläufe mit before, execute und after aus. Navigation oder Abbruch beendet Ereignisse, Beobachter und Darstellung. Bibliothek und Lernkarten verwenden ausschließlich die öffentliche Study-Wiederverwendung.

Das gemeinsame Schreibfeld lädt seine eigene HTML-Vorlage einmal je Browsermodul. Fehlgeschlagene Anfragen lehnen die Öffnungsaktion ab; Navigation während des Ladens bricht die Einbindung ab. Zeichengruppen des Anbieters bleiben in Mehrzeichenmustern erhalten.

## Schreibantworten verbergen

Die Überschrift des Zeichenfelds verbirgt zunächst das Zeichen hinter einer normalen Schaltfläche zum Aufdecken. Ein anderes Zeichen wird erneut verborgen. Schwebende Sitzungen melden ihre aktuelle Karte über die entfernbare Fähigkeit `study:drawing:observe`. Die passende Bibliotheksvorschau bleibt geöffnet, unscharf und nicht bedienbar, bis das Feld ein anderes Zeichen lädt oder geschlossen wird; Lesung und Bedeutung bleiben im Zeichenfeld verfügbar. Eingebettetes Schreiben nutzt dieselbe Verdeckung und meldet Aufdecken als unterstützten Versuch.
