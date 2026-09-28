# Benutzerbezogene Nachverfolgung neuer Bibliotheksinhalte

**Feature-Zweig:** feature-update-external-package-contract-definitions

## Dauerhafter Cache angesehener Inhalte

Cognis speichert nun die UUIDs angesehener Bibliothekseinträge pro Konto. Das Überfahren einer Karte oder ihr direktes beziehungsweise über eine Beziehung erfolgendes Öffnen markiert sie als angesehen, ohne den Verlauf anderer Benutzer offenzulegen.

## Kennzeichnung und Benachrichtigung neuer Inhalte

Nicht angesehene Einträge zeigen in Vorschau und Detailfenster einmalig **Neu**. Anbieteraktualisierungen und genehmigte globale Beiträge benachrichtigen aktivierte Benutzer über neue Sprachinhalte.

## Bereichsbezogene Beiträge und Prüfabläufe

Benutzer können persönliche Karten erstellen, Lehrkräfte zusätzlich Karten in eigenen Klassen und Administratoren globale Karten. Genehmigte Hochstufungsanfragen verschieben Karten in lehrergeführte Klassen oder die globale Sammlung; berechtigte Herabstufungen bringen sie zum ursprünglichen Einreicher zurück. Anbietergeschützte Karten können weder verschoben noch gelöscht werden.

## Durchsuchbare und konfigurierbare Bibliotheksoberfläche

Sprachanbieter können ebeneneigene Erstellungsfelder über eine ctx-Fähigkeit gestalten. Die globale Duplikaterkennung unterbricht die Erstellung zur Bestätigung, importierte Datensätze erhalten einen dauerhaften Suchindex, die Bibliothekssuche umfasst alle Ebenen, optionale Definitionen erscheinen unter dem Karteninhalt und die Mehrfachauswahl liegt mit wiederhergestellten schwebenden Aktionen an den gewünschten Kartenrändern.

## Sprachdefinierte Erstellung ist vollständig

Sprachpakete können nun für jede erstellbare Ebene einen geprüften `cardConstructor` angeben oder ihn über die öffentliche ctx-Fähigkeit `study:library:provider` registrieren. Cognis kombiniert Anbieterfelder mit rollenabhängigen Sichtbarkeits- und Klassenfeldern, zeigt die Klassenauswahl nur bei Bedarf und stellt Prüfungsanfragen berechtigten Lehrkräften sowie Administratoren bereit.

## Begrenzter Kartenstatus und kontextbezogene Veröffentlichung

Bereichs-, Neu- und Auswahlindikatoren am Kartenrand bleiben nun innerhalb der horizontalen Kartengrenzen; bei wenig Platz erhält der Hauptwert den größten Anteil der Vorschau. Die Mehrfachauswahl bietet jetzt ein schwebendes Menü „Veröffentlichen in“, eine echte lokalisierte Löschbeschriftung, das Zurückziehen ausstehender Anträge und berechtigte Rücksendungen ohne überflüssige Schließen-Schaltfläche.

## Prägnante Links und intelligentere Suche

Steuerelemente für verwandte Einträge zeigen nun ausschließlich den Hauptwert jeder Karte. Untergeordnete Karten besitzen deutlichere Oberflächen, eine stärkere Hintergrundtrennung und unabhängig per Maus aktivierbare Neu-Markierungen. Detailansichten schlagen anhand von Schriftzeichen, Wortschatzmetadaten und gemeinsamen Beziehungen ähnliche Einträge derselben Ebene vor. Sprachanbieter können außerdem zusätzliche Metadatenfelder als Filter für Lernende freigeben.

## Verbindlicher Vertrag für externe Pakete

Die Study Library validiert und bewahrt nun lokalisierte und anbieterspezifische Metadaten, erweiterbare deklarativ validierte Feldtypen, Asset-Listen, Paketbesitz und -schutz, semantische Darstellung, Definitionslokalisierung, Interessen und Aktivitätskompatibilität. Ein synthetisches Paket-Fixture bildet die Struktur eines Produktionsanbieters nach; die öffentliche Anbieterfähigkeit kann ein echtes Paket ohne Installation prüfen.

## Korrekturen für Bibliotheksansicht und Anbieter-Lebenszyklus

Suche und Bearbeitung der Bibliothek sind nun kompakt und designsicher gestaltet. Die Auswahl per Rechtsklick wird zuverlässig erfasst, verschachtelte Karten behalten ihre Hover-Flächen und Nicht-Zeichenkarten zeigen vollständige Lesungen und Definitionen ohne unnötige Kürzung. Inhaltsanbieter steuern die Sprachverfügbarkeit verbindlich. Inhaltsdatensätze unterstützen Namensraumklassen, Medienlisten bleiben beim Import erhalten, benutzerdefinierte Editoren folgen Validierungsverträgen, eingebaute Einschränkungen werden durchgesetzt und Installationsbelege bewahren Anbietermetadaten.

## Stabile Bibliothekssteuerung und ausgewogene Satzkarten

Satzkarten verwenden nun eine einheitliche begrenzte Höhe, lassen redundante Aussprachevorschauen weg und begrenzen Haupttext sowie Definitionen auf zwei Zeilen. Die Suche bietet genau eine kontrollierte Löschaktion, Bearbeitungssymbole nutzen ausdrückliche Design-Assets, Löschdialoge haben lokalisierte Beschriftungen und Wortschatzdetails zeigen Kana-Lesungen. Die Rechtsklickauswahl wird auf jeder eingebundenen Study-Seite an der Dokumentgrenze erfasst; maßgebliche Anbieteraktualisierungen entfernen Einträge, die im neuesten Paket fehlen, sofern ein Teilpaket dies nicht ausdrücklich deaktiviert.

## Eigene Navigation für Veröffentlichungsanfragen

Veröffentlichungsprüfungen befinden sich nun auf einer eigenen Anfragen-Seite der Study-Unternavigation, statt Platz in der Bibliothekswerkzeugleiste zu belegen. Prüfbare ausstehende Anfragen markieren den Link mit einer rot atmenden Kontur samt Alternative für reduzierte Bewegung; nach der letzten Prüfung verschwindet das Signal. Das Symbol zum Löschen der Bibliothekssuche passt sich nun an helle und dunkle Designs an.

## Sprachbezogene Verwaltung und geführte Kartenbearbeitung

Die Bibliotheksverwaltung zeigt nun ein flaches Ebenenmenü für die ausgewählte Sprache. Kartenklassen sind sichtbar und sicher bearbeitbar; Definitionen und Kompositionen erhalten erzwungene Klassen, Definitionen bleiben für Lernende verborgen, und Partikel sowie anbietergesperrte Datensätze sind nicht bearbeitbar. Bearbeitungsdialoge unterscheiden klar Ansicht und Bearbeitung, bieten Speichern und schützen ungespeicherte Änderungen. Die Kartenerstellung befindet sich als geführte `+`-Seitenaktion auf Lernendenseiten, Antragstellende sehen ihren Status, Popup-Titellesungen behalten Anbieterlinks, und verfügbare Study-Sprachen werden bei jedem Seitenaufruf neu geladen.

## Zuverlässige Aktionen für Lernkarten

Lernkarten behalten nun unabhängig von Löschrechten ein Auswahlsteuerelement, sodass ein Rechtsklick zuverlässig die Mehrfachauswahl öffnet, ohne das Browsermenü anzuzeigen. Erstellungsaktionen erkennen nun von Anbietern beigesteuerte Kartenkonstruktoren und registrieren die +-Schaltfläche über die CTX-Fähigkeit für Seitenaktionen.

## Lokalisierte Anfragen-Navigation beim ersten Laden

Der Navigationseintrag „Anfragen“ erhält nun lokalisierte Ersatzbeschriftungen von seiner eigenen Library-Route. Dadurch wird nach einem frischen Server- oder Browserstart nicht mehr der interne Pfad `/study/library/requests` angezeigt, während Übersetzungen geladen werden.

## Beziehungsrollen geordneter Sequenzen

Die Inhaltspaketvalidierung rekonstruiert Beschriftungen geordneter Sequenzen jetzt ausschließlich aus Kompositionsbeziehungen. Aussprache- und alternative Schreibbeziehungen können auf lexikalische Datensätze verweisen und ihre eigene Positionsfolge verwenden, ohne `ordered_sequence_content_unresolved` auszulösen; dies entspricht dem Vertrag des Japanisch-Lernanbieters.

## Klare Inhaltsklassen und Rückverknüpfungen

Detailansichten blenden nun die strukturelle Composite-Klasse aus, wandeln Anbieter-Klassensuffixe in lesbare Pills um und verwenden für zusammengesetzte Überschriften zwei Spalten mit Lesungen unter dem Primärtext. Umgekehrte Vokabellinks mit identischer Beschriftung werden unterdrückt, ohne die vorwärts gerichtete Schreibbeziehung zu entfernen.

## Fokussierte untergeordnete Kartenzweige

Beim Öffnen eines untergeordneten Kartenzweigs werden die Sichtbarkeitssymbole nicht zugehöriger Karten unscharf und Hover-Anhebung sowie Hervorhebung anderer Elternkarten neutralisiert. Der aktive Zweig bleibt scharf und interaktiv.

## Sichere Schemaentwicklung beim selben Besitzer

Neue Versionen eines maßgeblichen Inhaltspakets können nun ihr eigenes gespeichertes Schema bei derselben Kompatibilitätsversion überarbeiten. Besitzerprüfungen schützen weiterhin vor Schemakollisionen, und der Schema-Cache wird erst nach erfolgreicher transaktionaler Aufnahme aktualisiert. Dadurch kann das aktuelle Japanisch-Paket sauber über der vorherigen Version aktiviert werden.

## Zuverlässige Mehrfachauswahl-Steuerelemente

Die Study Library hält ihr schwebendes Aktionsmenü nun immer bereit, wenn Karten in den Mehrfachauswahlmodus wechseln können, auch in Ansichten ohne löschbare Anbieter-Datensätze. Auswahlkästchen verwenden außerdem einen Zeiger-Cursor, damit ihre Interaktivität klar erkennbar ist.

## Deaktivierte Sprachen und dauerhafter Lernstatus

Deaktivierte Sprachmodule fehlen nun vollständig in Study, selbst wenn während der Lebenszyklusaktualisierung vorübergehend eine veraltete Anbieter-Capability verbleibt. Inhaltsaktualisierungen behalten den Status angesehener Einträge bei und benachrichtigen Konten nur über tatsächlich neue stabile Datensätze statt erneut über das gesamte Paket.

## Deduplizierte verknüpfte Titeldetails

Library-Detailüberschriften vergleichen nun normalisierten Text und Linkziele zwischen Haupttitel und sekundären Schreibweisendetails. Eine bereits im Haupttitel verknüpfte Schreibweise wird aus der Detailzeile entfernt, ohne gleichlautende Links zu tatsächlich anderen Datensätzen zu unterdrücken.

## Abhängige Lesebeziehungen ohne Darstellung

Der Vertrag für externe Pakete behandelt Beziehungen ohne Resolver- und Darstellungsrolle nun als reine Abhängigkeitskanten. Sie bleiben für Rückwärtsnavigation und Löschschutz gespeichert, ohne als Titelkomposition interpretiert zu werden, und entsprechen damit dem `reading-kana-dependency`-Graphen des japanischen Anbieters.

## Vereinigte Rückwärtsbeziehungen

Library-Details vereinen Vokabelverwendung und andere eingehende Abhängigkeiten nun in einem Abschnitt „Verwendet von“. Optisch gleiche normalisierte Beschriftungen werden zu einem Link zusammengeführt, wobei Vokabelbeziehungen Vorrang haben.

## Ausgewogene Titelausrichtung

Zusammengesetzte Popup-Titel liegen durch einen kompakteren Zeilenabstand näher an ihrem Lesedetail. Titel, Lesungen und Definitionen in Kartenvorschauen bleiben zentriert, wenn die Beziehungs-Deduplizierung ein benachbartes Element entfernt.

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

Authentifizierte Seiten erlauben browsererzeugte Medien-URLs, sodass neu hochgeladenes Kartenaudio ohne Verstoß gegen die Inhaltssicherheitsrichtlinie wiedergegeben werden kann. Audio-Editoren zeigen den aktuellen Dateinamen und Lautsprechersymbole folgen dem Anwendungsdesign. Aussprachekarussells für zusammengesetzte Zeichen ersetzen die Schlagwort-Eingabe innerhalb des Aussprachefelds, verwenden die Zielschichtnamen des Anbieters und nummerieren Zeichen nach ihrer Reihenfolge im Kartentext statt nach veralteten Beziehungspositionen.

## Anbietergebundene Aussprache und dauerhafte Kartenänderungen

Aussprachefelder, die mit Anbieterbeziehungen verknüpft sind, zeigen ihre geordneten Auswahlkarussells nun direkt im Feld an, statt eine freie Tag-Eingabe beizubehalten. Sobald ein Benutzer eine vom Anbieter installierte Karte ändert, bewahrt ein späterer Anbieterabgleich diese Karte und ihre Beziehungen.

## Zweistufige Aussprachekomposition und stabiles Audio

Ausspracheeditoren wählen jetzt semantisch passende Komponentenkarten, zeigen deren Aussprache und übernehmen jede abgeleitete Lesung, bevor eine weitere zusammengestellt wird. Karussell-Vorschauen umschließen ihren Text vollständig, Audiosteuerungen bleiben in jedem Design sichtbar und Ersatz-Uploads verwenden einen stabilen kartenspezifischen Schlüssel.

## Geführte Strichreihenfolge und adaptive Zeichenübung

Die erste Anleitung nummeriert nun jeden Strich und zeigt einen Richtungspfeil. Zehn aufeinanderfolgende Fehler führen zu „Verloren!“ mit einem X; wird eine Karte mit keinem oder einem Fehler abgeschlossen, steigt ihre im Speicher gemerkte Schwierigkeit. Die Auswahl einer weiteren zeichnungsfähigen Bibliothekskarte lädt sie direkt in das geöffnete Zeichenfeld.

## Einmalige Anleitung, Verbundübung und geteiltes Audio

Die vollständige Zeichenanleitung erscheint nur beim ersten Versuch oder nach dem ausdrücklichen Zurücksetzen mit ?. „Noch einmal“ behält die schrittweise Anleitung bei; Verbundkarten leiten geordnete Zeichen-Gruppen ab und zeigen jedes neu erreichte Element vollständig. Wort- und Satzkarten dürfen keine eigenen Strichmuster besitzen. Alternative Anbieterzeichen verwenden verknüpftes Zeichen-Audio, Benutzer-Uploads bleiben maßgeblich und der Lautsprecher nutzt ein Theme-sicheres Inline-SVG.

## Zusammengesetztes Schreiben und zuverlässige Erstellung

Vokabelzeichnungen folgen jetzt der primären Schreibweise und ordnen alle aufgelösten Zeichen nebeneinander an; die Überschrift des Zeichenblocks enthält Lesungen und Bedeutung. Die gemeinsame Formularkomposition kennzeichnet Pflichtfelder einheitlich, bewahrt vom Anbieter gelieferte Strichmuster, validiert alternative Zeichen über die Wörterbuchsuche, bettet Ausspracheauswahlen für Zeichen ein und entfernt Karussellvorschauen beim Schließen von Dialogen.

## Zuverlässiges Bearbeiten, Zeichnen und Zusammensetzen

Kartenaktualisierungen und Audiowiedergabe werden jetzt über das aktuelle Anbieterschema migriert, und Detaildialoge behalten ihre Bearbeitungsaktion nach dem Bearbeiten. Die Zeichenübung bleibt begrenzt, lässt sich vorhersehbar skalieren, beschriftet einzelne Strichhilfen, verwendet bei Vokabeln die Schreibweise statt der Aussprache und schließt Sätze sowie Komposita aus. Die Kartenerstellung schließt Partikelkarten aus, stellt für Sätze und Komposita alle Zusammensetzungskarussells wieder her und bietet eine vorbereitende zeichenbasierte Ausspracheauswahl für Vokabeln und alternative Zeichen.

## Präzise verschachtelte Komposition

Verschachtelte untergeordnete Karten behalten jetzt ihre vom Anbieter zugewiesene Seite, wenn sie dort Platz finden. Verschachtelte Erstellungsdialoge liegen immer über ihrem übergeordneten Dialog, und die Aussprachekomposition entspricht nun dem Eingabe-Composer mit einem vorbereiteten Textfeld und einem Karussell für atomare Zeichen.

## Anbietergesteuerte Composer-Karussells

Kartenkonstruktoren trennen nun ausdrücklich die Beziehungs-IDs für Primäreingabe- und Aussprachekarussells. Alternative Zeichen benötigen aufgelöste Aussprachebeziehungen, aber keine Primärreferenzen. Lookup-Ergebnisse erhalten sichere Standardwerte für Anbietermetadaten, und die Platzierung untergeordneter Karten lässt keine Zweige mehr aus, wenn im deklarierten Raster keine Kapazität verbleibt.

## Strikte Composer-Deklarationen

Das abgeleitete Karussellverhalten wurde entfernt: Jeder Kartenkonstruktor muss beide Karussell-Arrays deklarieren. Die Serverprüfung verwendet nun Laufzeit-Formularkonstruktoren, Bearbeitungsformulare zeigen das deklarierte Aussprachekarussell, Audio-Ersatzschlüssel verwenden normalisierte Kartennamen und diagonale untergeordnete Karten behalten ihren zugewiesenen Platz.

## Wiederherstellung anbietergesteuerter Karussells

Kartenkonstruktoren kennzeichnen die Quellen der Eingabe- und Aussprachekarussells jetzt anhand der Zielschicht. Cognis ordnet diese Angaben nur Beziehungen mit der passenden Darstellungsrolle zu, sodass Aussprachekarussells wieder erscheinen und primäre Referenzen alternativer Zeichen optional bleiben.

## Review-Feedback und zuverlässige Platzierung im Composer

Die Bereinigung von Inhaltspaketen berücksichtigt jetzt den Herausgeber, Push-Anfragen verwenden den Datenbankvertrag korrekt und Löschprüfungen berücksichtigen nur ausstehende Anfragen. Generische Konstruktoren, Klassenveröffentlichung, freie zusammengesetzte Bezeichnungen, wiederholte Aussprachezweige, das Zurücksetzen verschachtelter Definitionen, eindeutige Audio-Uploads, kompatible Schemaentwicklung und entfernbare Ausspracheverknüpfungen funktionieren zuverlässig. Lautsprecher-Assets werden nun über explizite themenabhängige Bilder dargestellt, während Beziehungskarussells unter den vorgesehenen Inhaltsfeldern stehen.

## Karussellbearbeitung bestehender Karten

Bestehende Karten leiten nun sowohl Eingabe- als auch Aussprachekarussells aus ihrem Anbieter-Konstruktor ab. Benutzer- und Administrationsdialoge zeigen dieselben geordneten Karussellsteuerelemente wie die Erstellung und behalten vorhandene Auswahlen bei.

## Präzise Anleitung für lange Eingaben

Zeichenanmerkungen berechnen ihre Richtung nun in gerenderten Canvas-Koordinaten, wodurch ein Abdriften ab dem zweiten Zeichen längerer Eingaben verhindert wird. Die Anleitungsschaltfläche ? bewahrt akzeptierte Benutzerstriche und markiert nur noch nicht abgeschlossene Arbeit.

## Kollisionsfreie Zeichenanmerkungen

Strichnummern wählen nun die freiste verfügbare Position um jeden Startpunkt und vermeiden andere Anmerkungsmarkierungen sowie gerenderte Strichpfade, damit die Anleitung abgeschlossene Benutzerarbeit nicht verdeckt.

## Einheitliche Verträge für Erstellung und Bearbeitung

Erstellungs- und Bearbeitungsdialoge verwenden nun denselben Kartenkonstruktor-Vertrag des Anbieters für Felder und Beziehungskarussells. Alternative Zeichen können die Aussprache aus Zeichen zusammensetzen und zugleich freie Eingabe behalten; die Aussprache von Wortschatz, Sätzen und Verbünden wird rekursiv aus den konfigurierten Eingabeteilen abgeleitet.

## Abgeleitete Aussprache-Tags entfernt

Bearbeitungsformulare für Wortschatz, Sätze und Verbünde unterdrücken nun bedingungslos die generische Ausspracheliste und leiten die Aussprache weiterhin aus ihren geordneten Bestandteilen ab. Generische Listenfelder verwenden zeilengetrennten Text statt Tag-Chips.

## Progressives Zeichnen aus Erinnerung

Abschlüsse mit wenigen Fehlern blenden nun pro Karte eine weitere zufällige Strichhilfe aus, während die normale Validierung erhalten bleibt. Ein Fragezeichen auf der Zeichenfläche kennzeichnet verborgene Hilfe, das obere ? zeigt sie ohne Fortschrittsverlust, und Anmerkungen verwenden nähere sichere Positionen.

## Aussprache immer mit dem Composer bearbeiten

Sichtbare Aussprachefelder verwenden nun in Erstellungs- und Bearbeitungsdialogen immer den Aussprache-Composer. Die im Kartenkonstruktor deklarierten Aussprachekarussells bleiben schichtspezifisch und erscheinen innerhalb dieses Composers, während Schichten ohne deklarierte Beziehungskarussells weiterhin freie Ausspracheanteile eingeben können.

## Abgeleitete Audiosequenzen mit klarer Fehleranzeige

Wortschatz- und Satzkarten spielen ohne eigenen Upload die Audiodateien ihrer geordneten Bestandteile nacheinander ab. Ein optionaler Karten-Upload überschreibt die abgeleitete Sequenz; fehlt Audio bei einer Abhängigkeit, erklärt ein lokalisierter Hover-Hinweis den deaktivierten Lautsprecher.

## Karussells direkt mit der Aussprache verbunden

Die einheitliche Composer-Schnittstelle ergänzt Beziehungen, die durch Eingabe- oder Aussprachekarussell-Schichten deklariert sind, automatisch in den effektiven Konstruktor. Aussprachekarussells erscheinen dadurch zuverlässig in Erstellungs- und Bearbeitungsdialogen, und ihre Auswahl aktualisiert das versteckte Aussprachefeld unmittelbar, ohne separates Freitextfeld oder Bestätigungsschaltfläche.

## Aussprachekarussells aus dem Schema wiederhergestellt

Wenn ein sichtbares Aussprachefeld keine Karussellschichten aus dem Laufzeit-Konstruktor erhält, verwendet der einheitliche Composer nun die Zielschichten aller deklarierten Aussprachebeziehungen. Dadurch rendert der Kanji-Composer das Zeichenkarussell auch bei älteren Beiträgen mit leerem `pronunciation_carousels`.

## Semantische Karussellprofile entsprechen dem Autorenvertrag

Der Composer normalisiert Kartenkonstruktoren nun auf die verlangten semantischen Profile: alternative Zeichen erhalten freie Eingabe plus Zeichen-Aussprache; Wortschatz erhält Zeichen-, Alternativzeichen- und Wortschatz-Eingabe plus Zeichen-Aussprache; Sätze erhalten Partikel-, Alternativzeichen- und Wortschatz-Eingabe ohne bearbeitbare Aussprache. Wortschatzaussprache wird bis zur Zeichenebene vorbelegt, Satzaussprache ausschließlich daraus abgeleitet.

## Zeichen und Partikel sind unveränderlich

Atomare Zeichen und Partikel können weder über die Benutzeroberfläche noch über direkte API-Aufrufe erstellt, bearbeitet, zur Aktualisierung eingereicht oder gelöscht werden. Die Berechtigungsprojektion entfernt Bearbeitungs- und Löschaktionen auch für Administratoren und Eigentümer, während Einträge weiterhin schreibgeschützt betrachtet werden können.

## Rechtzeitige Hinweise für ausgeblendete Führungen

Die Zeichenübung zeigt das Fragezeichen auf der Leinwand nun nur an, wenn die aktuell erforderliche Strichführung ausgeblendet ist. Spätere ausgeblendete Striche lösen keinen vorzeitigen Hinweis mehr aus.

## Karussellübergreifende Kompositionspositionen

Die Eingabe-Karussells der Studienbibliothek verwenden in Erstellungs- und Bearbeitungsdialogen nun eine gemeinsame Reihenfolge. Die Positionsmarken zeigen die vollständig gespeicherte Komposition über alle Beziehungskarussells hinweg, statt in jedem Karussell erneut bei eins zu beginnen.

## Anbietereigene Schichtnamen und gültige abgeleitete Aussprache

Die Bibliotheksbearbeitung zeigt keine interne Inhaltsklassenauswahl zwischen semantischen Bezeichnungen wie Satz und Kompositum mehr. Stattdessen kennzeichnen lokalisierte Schichtnamen des Anbieters die Karten, geordnete Datensätze speichern die Anbieter-Schicht-ID, und automatisch abgeleitete Aussprachen folgen nun dem Feldtyp des Anbieters, sodass listenwertige Aussprachefelder erfolgreich übermittelt werden.

## Erforderliche abgeleitete Aussprachefelder bleiben auffindbar

Der Composer löst Definitionen abgeleiteter Aussprachefelder nun aus dem vollständigen Anbieterschema statt aus seiner für die Anzeige gefilterten Editorschicht auf. Satz- und andere abgeleitete Composer füllen erforderliche Aussprachefelder daher auch ohne direktes Eingabefeld.

## Ausgewählte Karten begleiten jede konfigurierte Karussellgruppe

Eingabe- und Aussprachebereiche zeigen nun immer ihr Feld für ausgewählte Karten, wenn der Konstruktor für den jeweiligen Bereich Karussells deklariert. Bestehende Auswahlen füllen das Feld, Karusselländerungen aktualisieren es sofort, und das Anklicken einer angezeigten Karte entfernt sie über denselben Karussellzustand.

## Mehrwertige Karussellkomposition und sicheres Löschen

Anbieterfelder können mit `multi_value` die mehrwertige Komposition aktivieren. Der Composer ergänzt eine feldspezifische Speicheraktion und Pillen für bestätigte Werte, ermöglicht deren erneutes Öffnen zum Ersetzen, begrenzt Texteingabevorschläge auf Karten der konfigurierten Karussells, weist nicht aufgelösten freien Text zurück und beschränkt bestätigtes Löschen auf eigene ×-Steuerelemente. Editoren bestehender Einträge binden ihre deklarierten Karussells nun wie Erstellungsformulare ein.

## Mehrwertige Zwischenablage verändert bestätigte Werte nicht mehr

`multi_value` auf Feldebene wird nun als maßgeblicher Vertrag eingelesen. Bestätigte Pillen bleiben von einem anfangs leeren Zwischenfeld getrennt, nur die sichtbare Speicheraktion bestätigt vorgemerkte Referenzen, und kompakte ×-Steuerelemente entfernen vorgemerkte Karten ohne Bestätigung oder Änderung gespeicherter Werte. Das Anklicken einer bestätigten Pille lädt sie nicht mehr in die Zwischenablage.

## Kanonische Bezeichnungen und sofortige Vorschauen

Kartenformulare zeigen für Karten außerhalb der Definitionsebene kein separates Feld „Bezeichnung“ mehr. Die Bezeichnung wird aus der geordneten primären Input-Komposition erzeugt; nach einer direkt gespeicherten Änderung wird der Kartenbrowser sofort neu gerendert, sodass seine Vorschau dem gespeicherten Eintrag entspricht. Mehrwertige Felder akzeptieren ausschließlich den Vertrag `multi_value` auf Feldebene; die in diesem Zweig eingeführte verschachtelte Schreibweise wurde entfernt und nicht als Kompatibilitätscode beibehalten.

## Unbeschnittene Hinweise und Karussellvorschauen

Hinweise auf fehlendes Audio verwenden nun ansichtsfensterbewusste Body-Portale statt einer absoluten Position innerhalb der Karte. Dadurch schneiden Überlaufregeln von Pop-ups und Karten den Text nicht mehr ab. Jeder Karusselleintrag besitzt wieder eine Vorschau bei Mauszeigerkontakt und Tastaturfokus, auch wenn kein zusätzlicher Definitionstext vorhanden ist.

## Gruppierte mehrwertige Aussprachen

Der Library-Vertrag wurde an den gruppierten Aussprachegraphen des Japanisch-Lernanbieters angepasst. Beziehungen können `grouped: true` deklarieren, und Einträge können beziehungsspezifische `referenceGroups` enthalten, in denen jedes verschachtelte geordnete Zeichenfeld zu genau einer Aussprache gehört. Inhaltsprüfung, Hashbildung, Speicherung, APIs, Erstellungs- und Bearbeitungscomposer, Titellinks sowie die abgeleitete Audioauflösung bewahren diese Grenzen nun durchgängig.

## Commits

- [5c5cb3d4](https://github.com/Cognis-Labs-HQ/Cognis/commit/5c5cb3d4)
- [c1874177](https://github.com/Cognis-Labs-HQ/Cognis/commit/c1874177fc1875ceab65c8b7aac58d60c5c5e091)
- [d6f1cf21](https://github.com/Cognis-Labs-HQ/Cognis/commit/d6f1cf219f2739174c01019b358ab939a24659f7)
- [8e38ded6](https://github.com/Cognis-Labs-HQ/Cognis/commit/8e38ded6f03e8e36d225e8d425625c1b719fa112)
- [c916c66f](https://github.com/Cognis-Labs-HQ/Cognis/commit/c916c66f2095da249058883026fa7eba94005316)
- [227f2166](https://github.com/Cognis-Labs-HQ/Cognis/commit/227f21669b5ab0a3473f0bf5f547bfdb424f4ca2)
- [64d53397](https://github.com/Cognis-Labs-HQ/Cognis/commit/64d53397)
- [84bedc67](https://github.com/Cognis-Labs-HQ/Cognis/commit/84bedc67)
- [617a2161](https://github.com/Cognis-Labs-HQ/Cognis/commit/617a2161)
- [365d5444](https://github.com/Cognis-Labs-HQ/Cognis/commit/365d5444)
- [11bec51d](https://github.com/Cognis-Labs-HQ/Cognis/commit/11bec51d)
- [b996336d](https://github.com/Cognis-Labs-HQ/Cognis/commit/b996336d)
- [8d4c4129](https://github.com/Cognis-Labs-HQ/Cognis/commit/8d4c4129)
- [d16a50d5](https://github.com/Cognis-Labs-HQ/Cognis/commit/d16a50d5)
- [ea24056d](https://github.com/Cognis-Labs-HQ/Cognis/commit/ea24056d)
- [bcb4e781](https://github.com/Cognis-Labs-HQ/Cognis/commit/bcb4e781)
- [87f30e20](https://github.com/Cognis-Labs-HQ/Cognis/commit/87f30e20)
- [d3ba08ef](https://github.com/Cognis-Labs-HQ/Cognis/commit/d3ba08ef)
- [6d6e4e53](https://github.com/Cognis-Labs-HQ/Cognis/commit/6d6e4e53)
- [5f8b129c](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f8b129c)
- [9c374e3f](https://github.com/Cognis-Labs-HQ/Cognis/commit/9c374e3f)
- [05838355](https://github.com/Cognis-Labs-HQ/Cognis/commit/05838355)
- [a0016fcd](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0016fcd)
- [0287eb84](https://github.com/Cognis-Labs-HQ/Cognis/commit/0287eb84)
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
- https://github.com/Cognis-Labs-HQ/Cognis/commit/bec24655948ca3a64ea6ab4f95f7897aecee68ac
- https://github.com/Cognis-Labs-HQ/Cognis/commit/1501e390dce637fb660c5b540a4235e3e7c98f29
- https://github.com/Cognis-Labs-HQ/Cognis/commit/71c842e2
- https://github.com/Cognis-Labs-HQ/Cognis/commit/3f72cfb6
- https://github.com/Cognis-Labs-HQ/Cognis/commit/47821a9b
- https://github.com/Cognis-Labs-HQ/Cognis/commit/f2afaa13
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e894f166
- https://github.com/Cognis-Labs-HQ/Cognis/commit/64d1ac04
- https://github.com/Cognis-Labs-HQ/Cognis/commit/23587bd7
- https://github.com/Cognis-Labs-HQ/Cognis/commit/c8c8deb9
- https://github.com/Cognis-Labs-HQ/Cognis/commit/48d14c1ba63d887a04305306f8c9de7565361dfa
- https://github.com/Cognis-Labs-HQ/Cognis/commit/872484294f2d3b777c6123286db62c78dc08f7f8
- https://github.com/Cognis-Labs-HQ/Cognis/commit/452e3eb3fc5b9e2ca86464904e7f6477992b7c32
- https://github.com/Cognis-Labs-HQ/Cognis/commit/039dc5c1
- [8b08718f](https://github.com/Cognis-Labs-HQ/Cognis/commit/8b08718f)
- [7841f27](https://github.com/Cognis-Labs-HQ/Cognis/commit/7841f27)
- [9aedc46](https://github.com/Cognis-Labs-HQ/Cognis/commit/9aedc46)
- [f405a3e](https://github.com/Cognis-Labs-HQ/Cognis/commit/f405a3e)
- [641d87a](https://github.com/Cognis-Labs-HQ/Cognis/commit/641d87a)
- [bbed779](https://github.com/Cognis-Labs-HQ/Cognis/commit/bbed779)
- [efd006d2](https://github.com/Cognis-Labs-HQ/Cognis/commit/efd006d2)
- [fb046ce2](https://github.com/Cognis-Labs-HQ/Cognis/commit/fb046ce2)
- [004b39e5](https://github.com/Cognis-Labs-HQ/Cognis/commit/004b39e5)
- [3e48b191](https://github.com/Cognis-Labs-HQ/Cognis/commit/3e48b191)
- [5cd8e7ff](https://github.com/Cognis-Labs-HQ/Cognis/commit/5cd8e7ff)
- [b00c41df](https://github.com/Cognis-Labs-HQ/Cognis/commit/b00c41df)
- [a0af7d1a](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0af7d1a)
- [54242971](https://github.com/Cognis-Labs-HQ/Cognis/commit/54242971)
- [125495f3](https://github.com/Cognis-Labs-HQ/Cognis/commit/125495f3)
- [109f583e](https://github.com/Cognis-Labs-HQ/Cognis/commit/109f583e)
- [b17ebe21](https://github.com/Cognis-Labs-HQ/Cognis/commit/b17ebe21)
- [aef137a4](https://github.com/Cognis-Labs-HQ/Cognis/commit/aef137a4)
- [82df83ce](https://github.com/Cognis-Labs-HQ/Cognis/commit/82df83ce)
- [501b4459](https://github.com/Cognis-Labs-HQ/Cognis/commit/501b4459)
- [65340e2d](https://github.com/Cognis-Labs-HQ/Cognis/commit/65340e2d)
- [b6dfb282](https://github.com/Cognis-Labs-HQ/Cognis/commit/b6dfb282)
- [79e872ea](https://github.com/Cognis-Labs-HQ/Cognis/commit/79e872ea)
- [6d0dd4d8](https://github.com/Cognis-Labs-HQ/Cognis/commit/6d0dd4d8)
