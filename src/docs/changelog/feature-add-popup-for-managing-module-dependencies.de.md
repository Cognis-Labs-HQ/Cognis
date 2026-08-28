# Abhängigkeiten externer Module

## Installation mit Abhängigkeiten

Externe Module können nicht empfohlene harte und optionale weiche Abhängigkeiten angeben. Die Installation zeigt alle Abhängigkeiten, blockiert bei unerfüllten harten Anforderungen, erlaubt die Auswahl beliebiger optionaler Begleiter und aktiviert ausgewählte Abhängigkeiten.

## Zuverlässige Aktivierung und Veröffentlichungskanäle

Das Abbrechen einer Integritätswarnung stoppt nun die Aktivierung von Abhängigkeiten und erforderliche Konfigurationsabläufe. Ausgewählte Veröffentlichungskanäle werden serverseitig gespeichert und bleiben auch vor der Installation nach Neustarts erhalten.

## Sichere Integritätsprüfung von symbolischen Links

Die SHASUM-Prüfung von Modulen folgt nun Datei-Links, deren Ziel innerhalb des Moduls liegt, einschließlich eines `AGENTS.md`-Alias für `.github/copilot-instructions.md`. Defekte Links, Verzeichnisse und Ziele außerhalb des Moduls werden weiterhin abgelehnt.

## Verifizierte Aliasse und Rückmeldung bei Abbruch

Nicht deklarierte symbolische Aliasse lösen keine SHASUM-Warnung mehr aus, wenn sie auf eine bereits deklarierte und geprüfte Moduldatei verweisen. Beim Abbruch der Installation wird nun eine eindeutige Benachrichtigung angezeigt.

## Abhängigkeitskarten für Installation und Aktivierung

Die Abhängigkeitsbestätigung zeigt nun vollständige Modulkarten mit Kennzeichnungen für erforderliche, optionale und empfohlene Module sowie direkten Detaillinks. Die Prüfung erfolgt vor Installation und Aktivierung und wird übersprungen, wenn alle Abhängigkeiten bereits aktiviert sind.

## Einheitliche Abhängigkeitssteuerung

Abhängigkeitskarten verwenden nun die etablierte Status-Pill-Farbpalette der Anwendung. Die Detailnavigation nutzt statt eines Textpfeils das vorhandene themenfähige SVG-Chevron.

## Sofortige Aktivierung von Abhängigkeiten

Jede unerfüllte Abhängigkeitskarte bietet nun eine direkte SVG-Downloadaktion mit Ladeanzeige, die die Abhängigkeit installiert und aktiviert. Die Hauptaktion zeigt Installieren oder Aktivieren, bleibt bei fehlenden erforderlichen Abhängigkeiten deaktiviert, nutzt bei verbleibenden optionalen Abhängigkeiten die neutrale App-Aktion und wechselt zum Bestätigungsstil, sobald alle Abhängigkeiten aktiviert sind.

## Abhängigkeitsbereitschaft vor der Fortschrittsanzeige

Installieren und Aktivieren führen nun dieselbe vollständige Bereitschaftsprüfung der Abhängigkeiten durch, bevor die Lebenszyklusaktion ihren Ladezustand beginnt. Beim Abbrechen des Abhängigkeitsdialogs wird sofort beendet, ohne dass der Aktionsspinner des Moduls weiterläuft.

## Kaskadierendes Abschalten harter Abhängigkeiten

Beim Deaktivieren eines Moduls werden nun rekursiv alle aktivierten Module deaktiviert, die es als harte Abhängigkeit deklarieren; weiche Abhängige bleiben aktiv. Abhängigkeitskarten verwenden nun ein eigenes Download-SVG mit Ablage statt eines allgemeinen Abwärtspfeils.

## Themenabhängige Abhängigkeitsaktionen

Download- und Wiedergabesteuerungen für Abhängigkeiten verwenden nun eigene helle und dunkle SVG-Assets. Installierte, aber deaktivierte Abhängigkeiten zeigen Wiedergabe statt Download, und der Text der Status-Pills folgt dem aktiven Thema, während die etablierten Statushintergründe erhalten bleiben.

## Korrekter Symbolkontrast in beiden Themen

Download- und Wiedergabesteuerungen für Abhängigkeiten verwenden nun dunkle Symbole auf hellen Flächen und helle Symbole im dunklen Modus, sodass beide Aktionen in jedem Thema sichtbar bleiben.

## Abhängigkeiten vor der Aktivierung konfigurieren

Abhängigkeiten, die eine Ersteinrichtung benötigen, öffnen ihren Konfigurationsdialog nun über der Abhängigkeitsverwaltung, bevor die Aktivierung versucht wird. Nach dem Speichern gültiger Einstellungen kann die Aktivierung fortgesetzt werden, ohne in einen serverseitigen Konfigurationsfehler zu münden.
