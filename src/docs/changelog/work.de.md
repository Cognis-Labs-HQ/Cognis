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

## Commits
- https://github.com/Cognis-Labs-HQ/Cognis/commit/7d00b6a7c8e6c0eaaf5315d595618f33c32dc3dc
- https://github.com/Cognis-Labs-HQ/Cognis/commit/0c9c4e376ffde5af485772367430d3122b589b0e
