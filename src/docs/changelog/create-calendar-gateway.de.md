# Kalender-Upgrade

## Persistente Kalenderdaten

Das Kalender-Gateway speichert Kalender, Termine und Teilnehmerantworten jetzt
über einen DB-gestützten Store, sobald die DB-Executor-Fähigkeit verfügbar ist.
Die Kalender-Routen unterstützen jetzt das Lesen, Aktualisieren und Löschen
einzelner Termine, Teilnehmerantworten und automatische Kopien für interne
Einladungen in einem Invited-Kalender.

## Umfangreichere Kalenderabläufe

Die Kalender-Popups unterstützen jetzt Anzeigen, Bearbeiten, Löschen und Antworten
auf Termine, einschließlich Wiederholung, Frei/Belegt-Steuerung und
Überschneidungswarnungen. Die Kalenderansichten zeigen aussagekräftigere Badges,
das Dashboard zeigt kommende Kalendertermine, die Übersetzungen wurden erweitert,
und Gateway-Tests decken spezielle Invited-Kalender, Terminaktualisierungen und
das Löschen gespiegelter Kopien ab.

## Fehlerbehebung: Termin-Popup beim Öffnen per URL nicht mehr blockiert

Wenn die Kalenderseite mit einem `eventId`-URL-Parameter geöffnet wird, lässt sich
das Termin-Popup jetzt wieder normal schließen. Zuvor wurde die Schließaktion
lautlos verworfen, weil der `onAction`-Handler nach dem String `"close"` prüfte,
obwohl die Popup-Implementierung die Aktion bereits intern in `null` umwandelt.
Die Prüfung erfolgt jetzt korrekt auf `null`, sodass das Popup geschlossen werden
kann und der Seitenlade-Indikator beim Direktaufruf nicht mehr endlos dreht.

## Kalender anklicken zum Bearbeiten

Jeder Kalender in der Seitenleiste ist jetzt ein einzelnes interaktives Element:
Ein Klick darauf öffnet direkt das Bearbeitungs-Popup. Der separate Stift-Button,
der zuvor neben jedem Kalendernamen erschien, wurde entfernt.

## Kalender-UI-Verbesserungen

Die Kalenderansicht-Steuerung ist jetzt eine einzeilige Werkzeugleiste – links befinden
sich die Navigationsschaltflächen mit der aktuellen Periodenbezeichnung, rechts der
Ansichts-Umschalter (Tag / Woche / Monat / Jahr). In der Wochenansicht wird die
ISO-Wochennummer nach Monat und Jahr angezeigt. In der Monatsansicht entfällt die
Ereigniszählung pro Tag; bis zu drei Ereignisse werden direkt angezeigt, und bei
weiteren erscheint ein „…"-Hinweis. In der Jahresansicht werden Tage mit Ereignissen
stärker farblich hervorgehoben. Die Ecke der Wochenachse hat nun dieselbe Hintergrundfarbe
wie die Zeitbeschriftungen, sodass die Achse durchgehend wirkt. Februars Monatskarte in
der Jahresansicht ist nicht mehr höher als die übrigen Monate.

## Benannte Freigabelinks ohne Mengenbegrenzung

Das Kalender-Freigabe-UI akzeptiert jetzt einen optionalen Namen für jeden generierten
Link, der die Unterscheidung mehrerer Links erleichtert. Es gibt keine künstliche
Begrenzung mehr – jeder neue Link wird im Popup angezeigt und bleibt abrufbar, bis
er abläuft.

## Zeitformat als Einstellung

Unter Datum &amp; Uhrzeit gibt es jetzt eine 12-/24-Stunden-Einstellung. Die gemeinsame
Zeitstempelformatierung nutzt diese Vorgabe, damit Kalenderzeiten, Nachrichtenzeiten,
Uhren und andere Uhrzeitangaben einheitlich im gewählten Format erscheinen.

## Schlankere Kalender-Slots

Tages- und Wochen-Slots behalten jetzt eine gleichmäßige Höhe und zeigen Termine als
gestapelte Karten mit fest verankertem Hinzufügen-Button statt ungleichmäßig zu wachsen.
Ein Klick in freie Bereiche eines Slots erstellt nun zuverlässig Termine und beseitigt
die bisherigen Dead Zones.
