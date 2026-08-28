# Schneller Sprachwechsel

**Feature Branch:** feature-add-language-switcher-with-settings-options

## Sprachumschalter im Dashboard

Mit der schwebenden Flaggenschaltfläche kann durch die bevorzugten Sprachen gewechselt werden. Die letzte Wahl wird nach fünf Sekunden an die erste Stelle gesetzt und durch Neuladen der Seite angewendet.

## Einstellung für Sprachen

Die Benutzereinstellungen aktivieren den Sprachumschalter standardmäßig, bieten eine Abwahl und zeigen beide Sprachlisten nebeneinander in einem zusammenhängenden Bereich.

Der Schalter bleibt auch beim erneuten Öffnen der Sprachseite synchronisiert. Änderungen aktivieren zuverlässig die Steuerelemente zum Speichern und Verwerfen der Einstellungen.

Beim Ausschalten der Einstellung werden die Einstellungen als geändert markiert. Das schwebende Steuerelement wird erst nach der Bestätigung durch Speichern ausgeblendet. Nach dem Neuladen bleibt keine leere Schaltfläche zurück.

## Seitenschaltflächen werden beim Navigieren aktualisiert

Seiten verwalten nun ihr eigenes Bearbeitungssteuerelement des Page Composer. Dadurch erscheinen beim Wechsel von einer nicht bearbeitbaren zu einer bearbeitbaren Seite sofort alle verfügbaren Aktionen, ohne dass die Seite neu geladen werden muss.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/741230d55d134bfb52a89d52831bedfdcc1c13f1
