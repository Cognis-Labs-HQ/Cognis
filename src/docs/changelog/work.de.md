# Studienbibliothek: Auswahl, Anfragefilter und sichere Audio-Bearbeitung
**Feature-Zweig:** work

## Vorhersehbare Mehrfachauswahl
Wenn alle sichtbaren Karten ausgewählt sind, wird die schwebende Aktion zu „Alle abwählen“. Beim Abwählen oder Verlassen der SPA-Seite endet der Mehrfachauswahlmodus zuverlässig.

## Gezieltes Durchsuchen von Anfragen
Die Anfrageseite bietet jetzt Status- und Eigentumsfilter. Die Prüfliste wird nur Administratoren und Lehrkräften angezeigt.

## Sicherere Kartenbearbeitung
Audio ist optional und wird unter einem deterministischen, von der Karte abgeleiteten Schlüssel gespeichert. Die Eingabetaste bei Tags sendet das Formular nicht ab, Kontrollkästchen verwenden den Cognis-Stil, Abbrechen-Aktionen sind als Abbruch gestaltet und Einträge der Zeichenebene können weder erstellt noch bearbeitet werden.

## Natürliches Scrollen der Bibliothek
Bibliotheksansichten verwenden jetzt das natürliche Scrollverhalten des Seiten-Composers.

## Geführter Designer für zusammengesetzte Karten
Zusammengesetzte Karten verwenden jetzt geordnete horizontale Karussells für jede Beziehungsebene. Die Erstellen-Aktion bleibt in jedem Karussell sichtbar und kann einen verschachtelten Karten-Composer öffnen. So lassen sich fehlende Bestandteile erstellen, ohne den übergeordneten Entwurf zu verlieren. Die Texteingabe zeigt passende Bestandteile und hebt nicht zugeordneten Text hervor.

## Sichere Sichtbarkeit und Audiowiedergabe
Der Dienst lehnt zusammengesetzte Karten ab, deren referenzierte Bestandteile am Ziel nicht sichtbar sind. Ungültige ältere Audio-Platzhalter lösen keine fehlschlagenden Audioanfragen mehr aus.

## Zuverlässiges Umschalten von „Alle auswählen“
„Alle auswählen“ besitzt jetzt einen eindeutigen Aktionszustand, statt das Klickverhalten aus den Kontrollkästchen abzuleiten. Die erste Betätigung wählt alle sichtbaren Karten und wechselt zu „Alle abwählen“; erst diese Aktion beendet die Mehrfachauswahl. Die Erkennung sichtbarer Karten funktioniert sowohl bei Lernkarten als auch in Verwaltungszeilen.

## Geführte Ebenen- und Textanlage
Der Erstellungsablauf beginnt jetzt mit einer Auswahl zulässiger Kartentypen. Nicht zugeordneter Freitext ist direkt verwendbar: Ein Klick öffnet den passenden verschachtelten Composer und übernimmt den fehlenden Text in die Kartenbezeichnung.

## Bereichsabhängige Bearbeitung und Änderungsprüfung
Verwaltungszeilen öffnen nur noch den Verwaltungseditor und behalten ihre unabhängigen Bearbeitungsschaltflächen. In benutzerseitigen Detaildialogen erscheint die Bearbeitung oben rechts nur für zulässige Einträge: Eigentümer dürfen eigene Karten bearbeiten, Administratoren globale Karten und geschützte Anbieterinhalte bleiben unveränderlich. Änderungen von Autoren an global veröffentlichten Karten werden als Änderungsanfragen gespeichert und erst nach Freigabe angewendet. Die Anfrageseite kennzeichnet sie gesondert und bewahrt abgeschlossene Zustände auf.

## Verfügbarkeit der Erstellen-Aktion
Jede benutzerseitige Ebene außer der Zeichenebene stellt nun die Erstellen-Aktion bereit. Fehlt ein spezieller Anbieter-Constructor, wird ein generischer schemagesteuerter Constructor verwendet.

## Deaktivierte Sprachanbieter verschwinden sofort
Study schneidet gespeicherte Lernsprachen jetzt vor der Darstellung von Einstellungen, Übersichtskarten, Suchgruppen und Unterseiten mit der aktuellen Liste aktivierter Anbieter des Gateways. Ein deaktivierter Anbieter verschwindet damit aus „Aktive Sprachen“ und der Study-Übersicht, ohne die gespeicherte Auswahl zu löschen, sodass er nach erneuter Aktivierung automatisch zurückkehrt.

## Commits
- https://github.com/Cognis-Labs-HQ/Cognis/commit/7d00b6a7c8e6c0eaaf5315d595618f33c32dc3dc
- https://github.com/Cognis-Labs-HQ/Cognis/commit/0c9c4e376ffde5af485772367430d3122b589b0e
- https://github.com/Cognis-Labs-HQ/Cognis/commit/32ca0df41b363566394ac0d4026ec73ed53ce9ae
- https://github.com/Cognis-Labs-HQ/Cognis/commit/a66d08376445e937ea0e57d64c5975c9c02ed504
- https://github.com/Cognis-Labs-HQ/Cognis/commit/800b1809b0378fcf6aaa480461d0e22b703c2ca4
