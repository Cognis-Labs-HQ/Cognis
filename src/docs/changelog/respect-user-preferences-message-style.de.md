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

## Hover-Popup für Lesebestätigungen korrigiert

Das Popup „Von N Personen gelesen", das beim Überfahren der Lesebestätigungsavatare erscheint, wurde nicht an der richtigen Stelle gerendert. Das Popup-Element verwendet nun `position: fixed` und verankert sich korrekt am überfahrenen Avatar.

## Horizontaler Überlauf bei eigenen Nachrichten behoben (Layout-Korrektur)

`max-width` wird jetzt auf das Nachrichten-Wrap-Flex-Element angewendet statt auf die Blase selbst, sodass der Prozentsatz korrekt gegen die Thread-Breite aufgelöst wird.

## Kompositionsbereich bleibt vollständig sichtbar

Die vollständige Höhenkette vom Viewport bis zum Content-Panel erzwingt nun `height: 100%; overflow: hidden` auf jeder Ebene, einschließlich `.content-panel`, sodass der Kompositionsbereich stets vollständig sichtbar bleibt.

## IRC: eigene Nachrichten durchgängig linksbündig

Im IRC-Stil sind Emoji-Reaktionschips, die Reaktionsauswahl und der Lesebestätigungsstatus für eigene Nachrichten nun linksbündig ausgerichtet.

## Sprechblasen-Avatar überlappt die Ecke

Der Absender-Avatar im Sprechblasen-Stil überlappt jetzt visuell die obere rechte Ecke bei eigenen Nachrichten und die obere linke Ecke bei eingehenden Nachrichten.

## Lesebestätigung außerhalb der Sprechblase

Im Sprechblasen-Stil erscheinen Zeitstempel und Lesebestätigungszeile nun unterhalb der Blase statt darin.

## Emoji-Schnellauswahl zeigt immer fünf Optionen

Wenn ein vorgeschlagenes Emoji als Reaktion verwendet wird, wird es durch ein Emoji aus dem Pool ersetzt, sodass die Auswahlleiste stets fünf Vorschläge anzeigt.

## Seiten-Composer `contentScrolling`-Option

Die neue Option `contentScrolling` (Standard `true`) in `createPageComposer` ermöglicht es einer Seite, in den Füllhöhen-Modus zu wechseln, indem `contentScrolling: false` übergeben wird.

## Composer bleibt in langen Threads sichtbar

Die Nachrichten-Seite nutzt jetzt den Fill-Height-Inhaltsmodus, sodass die Thread-Liste begrenzt ist und der Composer auch bei langen Verläufen sichtbar bleibt.

## "Weitere Reaktionen" zeigt Namen und Zeit inline

Das Popup "Weitere Reaktionen" zeigt jede Reaktionszeile jetzt als: Emoji + Benutzername + Reaktionszeit in einer Zeile.

## "Gesehen von X Personen" zeigt jetzt Avatare im Kopfbereich

Der Kopfbereich des Popups enthält nun zusätzlich zur Anzahl einen Avatar-Streifen der Leser.

## IRC-Abstände für Reaktionssteuerung erhöht

Die Abstände im IRC-Stil wurden erhöht, damit schwebender Reaktions-Picker und Tooltip-Bereich sauber zwischen Nachrichten erscheinen.
