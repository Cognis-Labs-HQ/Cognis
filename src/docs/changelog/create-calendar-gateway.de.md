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
