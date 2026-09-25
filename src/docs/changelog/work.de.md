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

## Integrierter Kompositionsablauf

Aufgelöste Karten befinden sich jetzt innerhalb des Eingabefelds, die Aussprache wird während der Eingabe aktualisiert, doppelte Karussellbeschriftungen werden zusammengeführt und Vorschauen werden nicht mehr vom Dialog abgeschnitten. Beziehungen verwenden eine schreibgeschützte Hierarchie, Definitionen können als wiederholbare Sätze für alle Sprachen erstellt werden, die Veröffentlichung erklärt die Prüfung klarer und Benutzerautoren sehen das administrative Steuerelement „Ausgeblendet“ nicht mehr.

## Zeichenfähige Karten und sichere Definitionen

Definitionsdatensätze können jetzt nur als verknüpfte Kinder einer anderen Karte erstellt werden; beim Schließen des Composers greift der gemeinsame Schutz vor Datenverlust. Kompakte Lautsprechersteuerungen spielen vollständige Audiofolgen von Kompositionen nur ab, wenn alle Bestandteile verfügbar sind. Ein neuer validierter Strichmustervertrag versorgt einen PiP-Zeichenadapter mit geordneter Strichbewertung, Live-Fortschritt, Rückgängig/Zurücksetzen und einstellbarer Hilfestellung.

## Bereitstellbarer Drawing-Adapter

Der Drawing-Adapter deklariert jetzt seinen TypeScript-Paketeinstiegspunkt und die getestete Study-Gateway-Abhängigkeit, sodass die Produktionsprüfung des Server-Builds ihn erfolgreich importieren kann.

## Präzise kompakte Kartenkomposition

Beziehungskarussells belegen jetzt genau zwei vertikal scrollende Zeilen, und Hover-Vorschauen verwenden das ansichtsbereichsabhängige verankerte Popup. Die exakte Übereinstimmung der gesamten Eingabe ersetzt die zeichenweise Ableitung und verhindert unbeteiligte Beziehungsknoten. Definitionen verwenden einen eigenen Dialog für alle Sprachen statt eines Karussells oder verschachtelten Karten-Composers; außerdem wurden Veröffentlichung/Erstellung, themengerechtes Audio, Zeichen-/Bearbeitungsaktionen und Tooltips verbessert.

## Adaptives Zeichnen und horizontale Karussells

Zweizeilige Karussells scrollen nun horizontal, Strichdaten bleiben aus Kartendetails ausgeblendet und das Zeichnen schließt den Ausgangsdialog. Themengerechte Zeichen-Assets und Feldfarben verbessern den Kontrast. Das skalierte PiP umfasst Zeichenfläche und Steuerungen vollständig; eine gleichmäßige Pfad-Neuabtastung unterstützt komplexe Zeichen und passt die Hilfe automatisch anhand Erfolgsquote und Schwierigkeitsrückmeldung an.

## Library-Bildlauf und verschachtelte Erstellung

Study-Library-Seiten verwenden jetzt den natürlichen Dokumentbildlauf und einheitlich große Kartenvorschauen. Karussellvorschauen bleiben an ihre Inhalte angepasst und verschwinden zuverlässig, während jede Hinzufügen-Aktion einen korrekt gestapelten, typgebundenen Editor mit dem Kartentyp im Titel öffnet. Die primäre Erstellen-Aktion verwendet nun den Standardstil der Design- und Sprachauswahl.

## Aussprachelinks über Beziehungen

Aussprachedetail-Links verwenden jetzt das vom Anbieter deklarierte Array `input.linkRelationships`. Referenzen aus Wortschatz- und Partikelbeziehungen werden nach ihrer vorgegebenen Position zusammengeführt. Jedes sichtbare Segment wird mit der Bezeichnung und den Aussprachealiasen der referenzierten Karte abgeglichen, während die ursprüngliche Karte das Navigationsziel bleibt.

## Automatische Zeichenrückmeldung

Das Zeichenfeld blendet Strichzähler und Hilfesteuerungen nun aus. Es beginnt mit der vollständigen Vorlage, stellt bei wiederholten Fehlern schrittweise Hilfen vom aktuellen bis zu den letzten Strichen wieder her, schüttelt sich bei einem falschen Strich rot und feiert ein vollständiges Zeichen mit grünem Schütteln und einem erzeugten Erfolgsklang.

## Fokussierte Zeichenhilfe und themengerechte Bedienelemente

Die Schreibübung führt nur durch den aktuellen Strich, verkürzt die Hilfe nach Erfolgen schrittweise und verlängert denselben Strich nach Fehlern. Zurücksetzen bewahrt die verringerte Hilfe; Rückgängig entfällt. Das Feld richtet Kartentext und Definition aus, passt Schließen an den Inhalt an und animiert Öffnen und Schließen. Die Library-Erstellung verwendet ein themengerechtes Zwei-Rem-Plus, Zielschicht-Überschriften und -Inhalte des Anbieters sowie an das App-Design angepasste Lautsprecher-Assets.

## Ausgerichtete und kanonische Zeichenausgabe

Die Überschrift der Schreibübung entspricht nun der Breite der Zeichenfläche und sitzt direkt darüber. Rückmeldungen schütteln sanfter, und akzeptierte Benutzerstriche werden durch die kanonischen Pfade des Anbieters ersetzt, damit ein fertiges Zeichen korrekt dargestellt wird.

## Stabiles Zeichnen und Kartenverfassen

Die Zeichenhilfe zeigt nur noch vollständige kanonische Striche, plant Leinwandaktualisierungen pro Animationsbild und hält akzeptierte Ausgaben kanonisch. Bibliotheksansichtsregister bleiben interaktiv, verschachtelte Editoren berücksichtigen den Zieltyp der Beziehung, zusammengesetzte Zeichen akzeptieren freie Bezeichnungen mit atomaren Aussprachebeziehungen, doppelte Zielkarussells werden entfernt, Tags sind bearbeitbar und Karussells verbergen ihre Bildlaufleiste.

## Anbieterunterstützte Editorsuche

Kompatible Inhaltsanbieter können jetzt lokalisierte Nachschlagedienste über die öffentliche Library-ctx-Fähigkeit registrieren. Der Karteneditor zeigt eine Aktion pro Dienst, übermittelt diesem die unverarbeitete Eingabe und wendet dessen kanonische Bezeichnung, Felder und geordnete Referenzen mit der höchsten Konfidenz an.

## Aktivierung öffentlicher Fähigkeiten

Die Modulaktivierung erkennt jetzt öffentliche Serverfähigkeiten, die über den System-ctx bereitgestellt werden. Japanische und andere Sprachmodule können `study:library:provider` voraussetzen, ohne einen falschen Konflikt wegen einer nicht verfügbaren Fähigkeit zu erhalten; private Fähigkeiten bleiben verborgen.

## Zuverlässige Bibliotheksformulare

Kartenaktualisierungen behalten ungeordnete Referenzen jetzt ohne ungültige Positionen. Beziehungsregister sind nur in der Ansicht sichtbar, zusammengesetzte Zeichen verwenden ein freies Eingabefeld und ein Aussprachekarussell, Nachschlageaktionen erscheinen nach der Eingabe in derselben Zeile, Strichmuster bleiben anbietereigen und verborgen, Steuerelemente zum Hinzufügen von Definitionen sind größer und neutral, und Vorschauen umschließen ihren Inhalt vollständig.

## Zuverlässige Bearbeitung integrierter Karten und paketiertes Audio

Bibliotheksaktualisierungen verwenden nun den strukturierten Aktualisierungsvertrag des Datenbank-Gateways, sodass die Bearbeitung integrierter Karten nicht mehr innerhalb von PostgreSQL fehlschlägt. Die Audiowiedergabe wird nur für Dateien angeboten, die mit einem Inhaltspaket ausgeliefert und vom Datei-Gateway gespeichert wurden; externe Platzhalter-URLs werden weder angezeigt noch abgerufen. Definitionsübersichten zeigen lokalisierte Übersetzungen in einer kompakten, nach Sprache beschrifteten Darstellung statt Anbieterschlüssel und Roh-JSON offenzulegen.

## Stabiler Abschluss der Schreibübung

Die Zeichnungsrückmeldung animiert jetzt nur die Zeichenflächenstufe. Das Ende einer Animation kann daher weder die Öffnungsbewegung des Feldes erneut abspielen noch das Fenster aufblitzen lassen. Ein neuer Versuch beginnt mit der vollständigen Zeichenvorgabe und geht nach dem ersten akzeptierten Strich jeweils um einen vollständigen Strich weiter. Nach Abschluss erscheinen ein Häkchen, die Meldung Gut gemacht, die Fehlerzahl des Versuchs sowie die Aktionen Schließen und Erneut versuchen.

## Audiowiedergabe und Aussprachebearbeitung

Authentifizierte Seiten erlauben jetzt browsererzeugte Medien-URLs, sodass neu hochgeladenes Kartenaudio ohne Verstoß gegen die Inhaltssicherheitsrichtlinie wiedergegeben werden kann. Bestehende Karten mit zusammengesetzten Zeichen zeigen beim Bearbeiten das vom Anbieter beschriftete Aussprachekarussell, behalten die ausgewählte Reihenfolge in den Beziehungsreferenzen bei und blenden die verschachtelte Erstellen-Aktion im reinen Auswahleditor aus.

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
- https://github.com/Cognis-Labs-HQ/Cognis/commit/344ccb5b
- https://github.com/Cognis-Labs-HQ/Cognis/commit/40da0c7a
- https://github.com/Cognis-Labs-HQ/Cognis/commit/584fb0b46ebb77bd43e585b3b41a279a0e6e9bfa
- https://github.com/Cognis-Labs-HQ/Cognis/commit/7d597603b3b1faf6df9d5c7a98973362312236d9
- https://github.com/Cognis-Labs-HQ/Cognis/commit/61002cd2578510ff6d823b8ebb454364e2c930cd
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e8dac803472e1dfc8a5bb2acf3082da88dad8a05
- https://github.com/Cognis-Labs-HQ/Cognis/commit/a6aa6fe85403331903570c9cd20f115ea48576be
- https://github.com/Cognis-Labs-HQ/Cognis/commit/1337d0a332a5ccb2d1081816d55e453f90a0c0bc
- https://github.com/Cognis-Labs-HQ/Cognis/commit/eda8cb2ab208b458f73e79f5b89fd6413ccbab77
- https://github.com/Cognis-Labs-HQ/Cognis/commit/337b23512bb9fd25e0ffce0d94058e4dcc959e84
- https://github.com/Cognis-Labs-HQ/Cognis/commit/67b413b535c0a8662cfe92c1170ccfc4742e6eae
- https://github.com/Cognis-Labs-HQ/Cognis/commit/c8893689
- https://github.com/Cognis-Labs-HQ/Cognis/commit/79cbfa05a5409f780bb42f4ea5ac7c0f8ec67f01
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e4daa661ee08b05a48ecba33182c490d4352e660
- https://github.com/Cognis-Labs-HQ/Cognis/commit/274fc626dbea45d3c8d66c82b98f1a0ba87a8052
- https://github.com/Cognis-Labs-HQ/Cognis/commit/024d7dfe05f713f390d7b9fb00410591018c9bf6
- https://github.com/Cognis-Labs-HQ/Cognis/commit/281d2ac4dca994692513c8069ad21fe9affebedc
- https://github.com/Cognis-Labs-HQ/Cognis/commit/f5214c148cab6eac78e3f8ee8aed3847ffba2201
