# Meeting-Chat Nachrichtenstil

## Sprechblasen- und IRC-Stil werden jetzt im Meetings-Chat berücksichtigt

Das Mini-Chat-Panel auf der Meetings-Seite liest nun die Nachrichten-Stileinstellung des Benutzers (Standard, Sprechblasen oder IRC) und wendet sie auf Chat-Nachrichten an – passend zum Verhalten der eigenständigen Nachrichten-Seite.

## Tipp-Indikator an die richtige Position verschoben

Die „Jemand tippt…"-Benachrichtigung auf der Nachrichten-Seite wurde von oberhalb des Nachrichtenverlaufs direkt über das Eingabefeld des Verfassers verschoben – an die Stelle, an der die nächste eingehende Nachricht erscheinen wird.

## IRC-Lesebestätigungen und Reaktionen verbessert

Das IRC-Layout auf der Nachrichten-Seite hält Lesebestätigungen jetzt in der gleichen Zeile wie die Nachricht und zentriert die Avatar-Symbole in der Lesebestätigung korrekt. Sprechblasen wurden außerdem klarer gestaltet. Der Mini-Chat in Meetings enthält nun dasselbe schwebende Reaktionsmenü und dieselbe Emoji-Auswahl wie Nachrichten.

## Sprechblasen jetzt deutlicher

Nachrichten im Sprechblasenstil nutzen jetzt einen stärker abgehobenen Oberflächen-Token und einen kräftigeren Schatten, damit sie auf dunklen Hintergründen klar sichtbar bleiben.

## Dunkelmodus-Farben für Sprechblasen

Eigene Nachrichten verwenden im Dunkelmodus jetzt ein tiefes Marineblau (#1d2f4a), fremde Nachrichten ein dunkles Blaugrün (#1a3336).

## SVG-Zustellungssymbole

Kreis-Indikatoren wurden durch SVG-Symbole ersetzt: ein Fragezeichen-im-Kasten direkt nach dem Senden und ein Häkchen-im-Kasten nach Zustellungsbestätigung.

## Gestapelte Lesebestätigungs-Avatare

Mehrere Leser-Avatare werden jetzt von rechts nach links überlappend angezeigt. Der leere Kreis vor dem ersten Lesevorgang entfällt. Ein Hover-Popup zeigt Name und Lesezeitpunkt jedes Lesers.

## Reaktionen außerhalb der Sprechblase

Reaktionen erscheinen jetzt unterhalb der Blase mit dezenter Hintergrundtönung.

## IRC-Handle-Format

Im IRC-Layout wird die Absenderkennung als `{{Handle}}` in doppelten geschweiften Klammern angezeigt.

## Sender-Avatar in Sprechblasen

Im Sprechblasen-Modus zeigen eigene Nachrichten einen halbgroßen Avatar, der die obere rechte Ecke der Blase überlappt.

## Horizontaler Überlauf bei eigenen Nachrichten behoben

Eigene Nachrichtenblasen passen sich jetzt an den breiteren Inhalt aus Nachrichtentext oder Metadatenzeile (Zeitstempel + Statussymbol) an. Kurze Nachrichten verursachen keine horizontale Scrollleiste mehr.

## Viewport-Höhen-Layout ohne Seiten-Scroll

Das Nachrichten-Thread-Panel füllt die gesamte Viewport-Höhe korrekt aus. Die Nachrichtenliste scrollt intern, während der Kompositionsbereich unten fixiert bleibt. Es erscheint keine seitliche Scrollleiste, und das Navigieren zu anderen Seiten stellt ihr normales Scrollverhalten wieder her.
