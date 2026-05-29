# PR-Änderungsprotokoll — Kalender-UI-Neugestaltung

## Zusammenfassung

Die seitliche Toolbar wurde in der Breite minimiert, um dem Kalender mehr
horizontalen Platz zu geben. Kalenderlisteneinträge zeigen jetzt ein
Sichtbarkeitssymbol (Schloss für privat, Globus für öffentlich) direkt neben dem
Kalendernamen.

Das Formular zum Erstellen neuer Kalender wurde aus der Toolbar in ein Popup
ausgelagert, das über eine „+"-Schaltfläche neben der Überschrift „Meine
Kalender" geöffnet wird. Die Farbauswahl im Popup befindet sich jetzt links neben
dem Namensfeld ohne separates „Farbe"-Label.

Der Termin-Editor ist kein eigenständiges Seitenelement mehr und wird
ausschließlich als Popup über das wiederverwendbare Popup-System geöffnet.

Die Tagesansicht zeigt jetzt einen einzelnen Tag mit Name und Datum als
Überschrift. Zeitfenster werden als beschriftete Zeilenindizes in einer festen
linken Spalte gerendert. Termine für jeden Slot erscheinen in einer angrenzenden
rechten Spalte. Ein Klick auf die leere Terminspalte oder die „+"-Schaltfläche
einer Zeile öffnet das Termin-Editor-Popup; ein Klick auf das Zeitfenster-Label
selbst löst keine Aktion aus.

Die Wochenansicht zeigt jetzt eine Monatszeile über dem Tagesraster. Jeder
Tagesspalten-Kopf zeigt Tagesname und Datum und ist anklickbar, um den Tag in der
Tagesansicht zu öffnen.

Die Monatsansicht zeigt keinen expliziten „Wochenansicht öffnen"-Button mehr.
Stattdessen ist die ISO-Wochennummer das klickbare Element in der linken Zelle
jeder Wochenzeile und lädt die entsprechende Woche in der Wochenansicht.

## Geänderte Dateien/Komponenten

- `src/gateways/calendar/ui/app.js`
- `src/gateways/calendar/ui/calendar-ui-helpers.js`
- `src/gateways/calendar/ui/calendar.css`
- `src/gateways/calendar/ui/languages/en/strings.xml`
- `src/gateways/calendar/ui/languages/de/strings.xml`
- `src/gateways/calendar/ui/languages/id/strings.xml`
- `src/gateways/calendar/ui/languages/ja/strings.xml`
