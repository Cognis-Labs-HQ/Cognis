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

## Sichtbare Klassen- und Bearbeitungssteuerung

Details zusammengesetzter Einträge und geordneter Sätze zeigen nun stets eine verständliche Klassenmarkierung; ältere Datensätze ohne gespeicherte Klasse erhalten „Composite“ als Rückfallwert. Die Bibliotheksverwaltung zeigt für jeden sichtbaren Datensatz wieder eine Bearbeitungsschaltfläche und erlaubt Administratoren dort auch die Bearbeitung anbieterverwalteter Inhalte. Lernkarten zeigen bei serverseitig erteilter Berechtigung eine Bearbeitungsaktion; zulässige Detaildialoge bieten dieselbe Aktion oben rechts. Serverseitige Berechtigungshinweise halten globale Administratorbearbeitung, Eigentümerbearbeitung und prüfpflichtige Autorenänderungen konsistent, ohne sich auf veraltete Browser-Rollen zu verlassen.

## Erweiterte Nutzlastkapazität des Schlüsselbunds

Die Standardkapazität des verschlüsselten Schlüsselbund-Tresors beträgt jetzt 2.000 MiB und ist damit tausendmal so groß wie die bisherige Grenze von 2 MiB. Große verschlüsselte Geheimnisse mit Audiodaten können dadurch ohne 413-Antwort gespeichert werden.

## Strukturierte Kartenerstellung und -bearbeitung

Bearbeitungsaktionen für Karten erscheinen jetzt nur noch in Detaildialogen und verwenden das themenabhängige Bearbeitungssymbol. Der breitere Editor trennt Inhalt, Beziehungen und zusammengefasste Definitionen in Registerkarten. Lokalisierte Definitionen bieten alle unterstützten Oberflächensprachen, und verknüpfte Definitionen können direkt bearbeitet werden. Beim Erstellen werden Bezeichnungen aus aufgelösten Bestandteilen erzeugt, nicht zugeordneter Text muss aufgelöst oder erstellt werden, das horizontale Karussell wird wieder korrekt formatiert und die themenabhängige Erstellungsaktion ist größer.

## Verfeinerte Erstellungssteuerung

Die Erstellungsaktion der Bibliothek behält ihre normale Schaltflächengröße bei; nur das Pluszeichen ist doppelt so groß. Die Registerkarten werden nun korrekt initialisiert, der persönliche Bereich ist Standard, berechtigte Administratoren können die globale Veröffentlichung auswählen und Lehrkräfte sehen die Klassenveröffentlichung nur für beschreibbare Klassen der aktiven Sprache. Die Inhaltsklasse wird nur bei relevanten Rollen als Auswahl angezeigt, das Kompositionsfeld heißt „Eingabe“ und zeigt beim Fokussieren die Beziehungskarussells.

## Intelligentere dauerhafte Komposition

Beziehungssammlungen zeigen jetzt alle Elemente ohne Bildlaufleisten oder Richtungspfeile. Hover-Vorschauen zeigen eine minimale Karte mit der Definition in der aktuellen Oberflächensprache. Karussellauswahl und Freitextvorschläge werden sofort zu verschiebbaren Eingabeblöcken. Deren Reihenfolge aktualisiert die Beziehungen, ausgewählte Inhalte leiten zugehörige Referenzen ab, die Aussprache folgt referenzierten Schreibeinheiten und die Definitionserstellung fordert jede unterstützte Oberflächensprache an.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/7d00b6a7c8e6c0eaaf5315d595618f33c32dc3dc
- https://github.com/Cognis-Labs-HQ/Cognis/commit/0c9c4e376ffde5af485772367430d3122b589b0e
- https://github.com/Cognis-Labs-HQ/Cognis/commit/32ca0df41b363566394ac0d4026ec73ed53ce9ae
- https://github.com/Cognis-Labs-HQ/Cognis/commit/a66d08376445e937ea0e57d64c5975c9c02ed504
- https://github.com/Cognis-Labs-HQ/Cognis/commit/800b1809b0378fcf6aaa480461d0e22b703c2ca4
- https://github.com/Cognis-Labs-HQ/Cognis/commit/ea81a944257040a042c1d0c0c9b2447768390221
- https://github.com/Cognis-Labs-HQ/Cognis/commit/3b51abc17cc6ed3a75921bfa242d16c33aae2ce0
- https://github.com/Cognis-Labs-HQ/Cognis/commit/2e2d092813312978c2f69640389f6401ec0230f5
- https://github.com/Cognis-Labs-HQ/Cognis/commit/cff7223cd64c36372e64484c362ba9b1a1f4e2f7
- https://github.com/Cognis-Labs-HQ/Cognis/commit/bbb6bb8bd8e2d70a6ec571c2a69e58665a90ca04
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e1e564bf66580e7a1e8eaf24080c646f686d982c
