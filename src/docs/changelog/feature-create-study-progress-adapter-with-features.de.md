# Lernfortschrittsereignisse

**Feature-Zweig:** feature-create-study-progress-adapter-with-features

## Unveränderliche Fortschrittsmessung

Fügt datenschutzbezogene, idempotente Lernereignisse, ausgleichende Korrekturen, wiederherstellbare Lernstandsprojektionen, mehrdimensionale Aggregation und einen gestuften Erweiterungsablauf hinzu.

## Metadatenfiltergruppen funktionieren

Bibliotheks-Metadatengruppen können nun exklusive Einzelauswahlpillen festlegen oder Mehrfachauswahl erlauben. Eine Auswahl blendet nicht passende Karten sofort aus, auch wenn deren Rasterdarstellung zuvor den Zustand `hidden` übersteuerte.

## Authentifiziertes Audio mit Thema

Bibliotheksaudio wird nun über den authentifizierten Study-Gateway-Client statt über eine nicht authentifizierte native Medienanfrage geladen. Temporäre Medien-URLs werden danach bereinigt, und native Steuerelemente folgen dem hellen oder dunklen Anwendungsthema.

## Konforme Bibliotheks-UI-Struktur

Der Einstiegspunkt des Bibliotheksbrowsers wurde in die vorgeschriebene Adapterstruktur `ui/app/index.js` verschoben. Laufzeitroute und Strukturtests wurden aktualisiert. Dokumentationsprüfungen ignorieren nun erzeugte Build-Ausgaben, Benennungsprüfungen erfassen die verschobene Quelle sauber, und Routertests berücksichtigen dynamische Gateway-Routen sowie erhaltene Navigationszustände.

## Wiederholbare Inhaltsimporte

Inhalts-IDs der Lernbibliothek bleiben jetzt über Paketversionen hinweg stabil, und jeder Eintrag speichert einen kanonischen Inhaltshash. Der Import führt ältere versionsabhängige IDs und wiederholte identische Hashes zu einem kanonischen Eintrag zusammen und erhält eingehende sowie ausgehende Verweise. Dadurch entstehen keine wiederholten Alphabet- oder Wortschatzkarten.

## Klare Audiofehler

Fehlgeschlagenes Bibliotheksaudio ersetzt jetzt nur seinen Player durch eine lokalisierte Meldung auf derselben thematischen Fläche, anstatt einen Fehler der gesamten Bibliothek zu melden. Steuerelemente im dunklen Modus verwenden die Akzent- und hervorgehobenen Flächenfarben der Anwendung.

## Gerichtete Zeichenvarianten

Beziehungen von Zeichen und alternativen Zeichen können eine Variantenrichtung nach links, rechts, oben oder unten deklarieren. Die Bibliothek hält jede Variante unabhängig und klappt untergeordnete Steuerelemente beim Überfahren oder Tastaturfokus um die übergeordnete Karte aus.

## Vom Eigentümer gesteuerte Löschung

Inhaltseigentümer, Administratoren und Eigentümer können jetzt mehrere Bibliothekseinträge auswählen und sie mit ihren Beziehungen dauerhaft löschen. Bei der Modulaktivierung werden fehlende bereitgestellte Inhalte standardmäßig wiederhergestellt; ein ausdrückliches Kontrollkästchen bei der Löschung sperrt stattdessen die ausgewählten Inhalts-Hashes und verhindert ihre Rückkehr.

## Nutzbare Varianten und Auswahl

Gerichtete Varianten verwenden jetzt die vollständige Darstellung einer Bibliothekskarte mit leichter Transparenz und schwebendem Schatten. Ihr Hover-Bereich bleibt mit dem übergeordneten Eintrag verbunden, sodass Benutzer zu ihnen wechseln und sie öffnen können. Mehrfachauswahlkästchen bleiben bis zum Halten einer berechtigten Karte verborgen, unterstützen den dunklen Modus, und die Bibliotheksroute lädt wieder die vollständige Gestaltung der Study-Unternavigation.

## Platzierung der Aussprache

Karten und Detailtitel von Schreibeinheiten zeigen die Zeichenaussprache nun neben dem Zeichen; Aussprachen von Wörtern und Sätzen bleiben unter dem Text. Bedeutungstragende Einzelzeichenwörter können modulseitig durch eine lexikalische Beziehung zu genau einem Zeichen deklariert werden, und Zeichendetails zeigen die entsprechenden eingehenden Wörter.

## Gezielte Links und Aktionen

Die Auswahl per einem Rechtsklick öffnet jetzt die vorhandene schwebende Aktionsleiste mit Alle auswählen, Löschen und Schließen; normale Kartenklicks beenden den Auswahlmodus. Häkchen sind zentriert, dunkle Audio-Steuerelemente unterdrücken den nativen Orangeton, und Beziehungsklicks aktivieren und markieren die Zielkategorie. Definitionstext trägt seinen Link jetzt direkt, während Bestandteilsfelder auf deklarierte Resolver-Beziehungen beschränkt sind, um doppelte und unpassende Katakana-Links zu entfernen.

## Stabile Filterung mit Varianten

Metadatenfilter verarbeiten jetzt nur Basiskarten der Bibliothek mit serialisierten Filterdaten. Schwebende gerichtete Varianten erreichen den Filterparser nicht mehr mit einem undefinierten Datensatzwert, wodurch der Laufzeitfehler auf der Bibliotheksseite behoben ist.

## Neutrale Aussprache und Audio

Zeichenaussprachen neben Detailtiteln verwenden jetzt maskierten sekundären Titeltext in kleinerer Schrift und normaler Stärke. Dunkle Audioflächen lehnen erzwungene Farbersetzungen ausdrücklich ab und wenden neutrale Gestaltung auf native Medienbedienfelder und Steuerelemente des Browsers an.

## Designgesteuertes Audio und zuverlässige Varianten

Die Bibliothek rendert nun eigene barrierefreie Audiosteuerelemente, statt die nativen Mediensteuerelemente des Browsers zu verwenden. Dadurch gelangen keine Akzentfarben des Betriebssystems oder erzwungener Designs in den Player. Zeichenkarten werden beim Zeigen und bei Tastaturfokus über benachbarte Rasterkarten angehoben, damit ihre gerichteten untergeordneten Varianten sichtbar und interaktiv bleiben.

## Moduldefinierte Diagrammraster

Bibliotheksebenen können jetzt eine Zeilengröße anfordern und Inhalte anhand der Datensatz-ID positionieren, einschließlich ausdrücklicher Leerzellen für herkömmliche Diagramme. Karten werden gleichmäßig auf die angeforderte Zeile skaliert; schwebende untergeordnete Karten werden nun mit 95 % Deckkraft dargestellt.

## Erforderliche Metadatenfilter

Module können Metadatenfiltergruppen als erforderlich markieren und ein Standard-Tag bestimmen. Erforderliche Gruppen behalten stets eine Auswahl; Gruppen mit nur einem dargestellten Tag wählen dieses automatisch aus.

## Eindeutige Zeichenkompositionen

Details zu Alternativzeichen und Wörtern gruppieren auflösungsbasierte Zeichenverknüpfungen jetzt unter den vom Modul definierten Beziehungsbezeichnungen und setzen Kompositionsoperatoren zwischen geordnete Zeichen. Definitionen und Aussprachen bleiben von diesen Schreibkompositionen visuell getrennt.

## Bewusstes Öffnen von Varianten

Karten mit untergeordneten Elementen zeigen beim Darüberfahren einen Hinweis zum Gedrückthalten und öffnen Varianten erst nach der Halteschwelle. Variantenkarten behalten ihren grünen Rahmen beim Darüberfahren, schließen beim Verlassen des Fokus aus der gesamten Kartengruppe und erscheinen zusätzlich in einem eigenen Abschnitt der übergeordneten Detailansicht.

## Sichtbare Richtung der Kindkarten

Geöffnete untergeordnete Karten haben jetzt einen grünen Rahmen und einen grünen Pfeil, der ihre Richtung vom übergeordneten Element zeigt. Der Abstand zwischen Eltern- und Kindkarte verwendet denselben Wert wie das normale Kartenraster.

## Variantenvertrag mit drei Positionen

Variantenbeziehungen deklarieren jetzt ausdrücklich `variant: true`; Richtungen sind auf links, oben und rechts beschränkt. Ohne Angabe wählt die Bibliothek die erste freie Position. Richtungspfeile werden als getrennte Assets für helles und dunkles Design geliefert; der veraltete Versionseintrag des repositoryinternen Japanisch-Adapters wurde entfernt.

## Vertauschte Kartengesten

Ein Rechtsklick öffnet jetzt die Mehrfachauswahl, während das Halten einer übergeordneten Karte bis zur Langdruckschwelle ihre Kinder einblendet und offen hält. Kindkarten sind vollständig deckend und behalten im Ruhezustand wie beim Darüberfahren denselben grünen Rahmen; das Abwählen des letzten Eintrags beendet die Mehrfachauswahl automatisch.

## Strukturierte, deduplizierte Bibliotheksanzeige

Die Bibliothek verwendet lokalisierte Ebenennamen, zeigt nur deklarierte und nicht leere Felder und wiederholt Varianten nicht mehr im Detailfenster. Definitionsgestützte Ebenen erzwingen Referenzen auf lokalisierte Bedeutungen; Sprachmodule können zusammengesetzte Satzbedeutungen samt Partikelwirkung über den Detail-Flow liefern. Raster unterstützen außerdem numerische Anzeige-IDs und ausdrückliche Leerplätze.

## Definitionen bleiben eingebettet

Definitionsdatensätze können nicht mehr direkt geöffnet werden und liefern ausschließlich Text für andere Karten. Die Oberfläche zeigt lokalisierte Inhalte nur in der aktiven UI-Sprache. Neue Darstellungsrollen unterscheiden Zusammensetzungen, alternative Schreibweisen und Aussprachen, während definitionsgestützte Vorschauen nun die tatsächlich referenzierten Definitionsdatensätze erhalten.

## Zusammensetzungslink in der Überschrift

Wenn ein einzelner Zusammensetzungslink denselben Text wie die aktuelle Karte trägt, ersetzt der Link jetzt die Pop-up-Überschrift und der doppelte Zusammensetzungsabschnitt entfällt.

## Bibliotheksbreite ohne Überlauf

Das umgebende Widget passt seine Breite jetzt an das Bibliotheksschema an und wird zugleich auf den verfügbaren Bereich begrenzt. Dadurch entsteht rechts kein ungenutzter Überhang oder horizontaler Seitenüberlauf.

## Geschützte Verträge der zentralen Seitenhülle

Eine vollständige, maschinenlesbare Liste geschützter Klassen für Seitenhülle, Composer, Navigation, Widgets und Pop-ups wurde festgelegt. Komponenten-CSS und -Skripte dürfen diese Interna nicht mehr überschreiben oder durchlaufen; bestehende Verstöße verwenden nun ausdrückliche Composer-Optionen, Pop-up-APIs und deklarierte Layoutvariablen des Kerns.

## Sprachcode-Verarbeitung der Bibliothek wiederhergestellt

Die ausdrückliche Abhängigkeit vom Sprachcode-Parser wurde im ausgelagerten Darstellungsmodul der Bibliothek wiederhergestellt. Dadurch schlägt die Bibliotheksroute beim Auflösen lokalisierter Bezeichnungen und Definitionen nicht mehr fehl.

## Wiederverwendbare UI-Verträge schützen

Die Durchsetzung der UI-Zuständigkeit wurde auf jede Klasse aus wiederverwendbaren Kernstilen erweitert. Ein vollständiges Verzeichnis und eine Architekturprüfung verhindern nun, dass Adapter, Gateways und Module wiederverwendbare Steuerelemente überschreiben; bisherige Überschreibungen wurden in komponenteneigene Selektoren oder die allgemeine wiederverwendbare Implementierung verlagert.

## Unsichere Aktivierung externer Module blockieren

Beim Aktivieren externer Module führt der Host nun vor den Modultests eine Grenzprüfung durch. Direkte Importe und URLs zu Cognis-Interna sowie CSS-Überschreibungen aller geschützten Kern- oder Wiederverwendungsklassen werden abgelehnt; Integrationen über die bereichsgebundenen `ctx`-Fähigkeiten bleiben zulässig.

## Benutzermenü nach der Seitennavigation wiederhergestellt

Die beibehaltene Dashboard-Oberfläche wird nach clientseitiger Navigation nun vollständig übersetzt, sodass alle Aktionen im Benutzermenü auf der Lernseite und allen anderen Dashboard-Seiten beschriftet bleiben.

## Gesamte Seitenbreite für die Bibliothek verwenden

Die Bibliothekskarte füllt nun ihre Zuweisung im Seiten-Composer aus. Die Layout-Bearbeitung ist deaktiviert, damit gespeicherte Anpassungen diese feste Anwendungsoberfläche nicht verkleinern oder verschieben können.

## Benutzermenü dauerhaft in der Seitenoberfläche bereitstellen

Das Benutzermenü besitzt nun ein eigenes Stylesheet der zentralen Seitenoberfläche. Das Dashboard-Layout hält das zentrale Oberflächenpaket bei direkten Aufrufen und SPA-Navigation ausdrücklich geladen.

## Benutzermenü über den Navigationsrand hinaus anzeigen

Die fixierte Kopfzeile der Seitenoberfläche schneidet überlaufende Inhalte nicht mehr ab. Dadurch wird das Benutzermenü unterhalb des primären Navigationsrands mit seiner vorgesehenen Stapelreihenfolge angezeigt.

## Menüaktionen „Freigaben“ und „Abmelden“ vereinheitlicht

Asynchron hinzugefügte Einträge wie „Freigaben“ erhalten nun automatisch die Styles der Seitenoberfläche. „Abmelden“ verwendet beim Darüberfahren die Darstellung einer Abbruchaktion und ein themeabhängiges Ein-/Aus-Symbol.

## Themeabhängige Aktionsrückmeldung verfeinert

Beim Abmelden steht nun Abstand zwischen Ein-/Aus-Symbol und Beschriftung; beim Darüberfahren nimmt das Symbol den Rotton der Abbruchaktion an. Links auf der Lernstartseite verwenden im hellen Modus die hellere Erfolgsdarstellung statt des kräftigen Grüntons des dunklen Themes.

## Interaktionen und Typografie der Bibliothekskarten stabilisiert

Eingeblendete untergeordnete Karten maskieren nun die darunterliegende Karte am Mauszeiger, Detailüberschriften sind fünfzig Prozent größer und Auswahlaktionen besitzen einheitliche Abstände. Die Detailzusammenstellung erhält jetzt die Variantenposition korrekt und öffnet dadurch wieder Details für referenzierte Einträge aktueller Sprachmodulpakete. Die bevorzugte Schriftgröße bildet nun die Wurzel-Basis; feste Pixel- und Punktgrößen wurden in relative Einheiten umgewandelt.

## Eingeblendete untergeordnete Karten visuell getrennt halten

Die Hover- und Tastaturfokusregeln untergeordneter Karten überschreiben nun zuverlässig die gemeinsame Hover-Darstellung neutraler Schaltflächen. Eingeblendete Varianten behalten Oberfläche und Position, sodass die darunterliegende benachbarte Karte nicht durchscheint.

## Eingeblendete Varianten von benachbarten Karten trennen

Während die untergeordneten Karten eines Elternelements geöffnet sind, legt das Kartenraster nun eine nicht interaktive Unschärfe- und Tönungsebene über benachbarte Karten, jedoch unter das aktive Elternelement und dessen Kinder. Dadurch vermischen sich transparente Kindoberflächen nicht mehr optisch mit benachbarten Karteninhalten.

## Minimale Ebenendarstellung

Bibliotheksschemas können einzelne Ebenen für kompakte Karten aktivieren, die nur den primären Inhalt des Eintrags anzeigen. Klicken, Auswahl per Rechtsklick, Variantenanzeige durch langes Drücken und eingeblendete untergeordnete Karten verwenden weiterhin das bestehende Interaktionsmodell.

## Einstellungsabhängige Popup-Typografie

Detail-Popups leiten ihre Typografie jetzt von der vom Benutzer gewählten Anwendungsschriftgröße ab und verwenden proportionale Überschriftsebenen statt einer übergroßen festen Bibliotheksüberschrift. Externe Module mit absoluten CSS-Schriftgrößen scheitern vor der Aktivierung an der Grenzprüfung.

## Scheinbaren Bibliotheksüberlauf entfernen

Ausgeblendete gerichtete Variantenkarten tragen nicht mehr zum scrollbaren Überlauf bei. Sie werden bis zur gezielten Anzeige aus dem Layout entfernt. Dadurch verschwinden der leere kartenbreite Bereich und die horizontale Bildlaufleiste, während langes Drücken und die Anzeige über Direktlinks erhalten bleiben.

## Einheitliche Bibliothekssteuerung und geprüfte Sätze

Abmelden behält beim Darüberfahren ausschließlich die rote Abbrechen-Darstellung. Minimale Karten zeigen Aussprache und lokalisierte Definition neben dem Hauptwert; Detailtitel und Audiofehler verwenden korrigierte relative Größen. Die Inhaltspaketaufnahme weist geordnete Sätze zurück, deren Text nicht durch verknüpfte lexikalische Einheiten oder Partikeln belegt ist.

## Nicht verfügbare Studienrouten umleiten

Study-SPA-Routen werden nur noch angeboten, solange mindestens ein gültiges, aktiviertes Sprachmodul vorhanden ist. Direkte Anfragen und zwischengespeicherte SPA-Einbindungen werden zu `/error?code=503` umgeleitet, wenn Study nach der Sprachvalidierung nicht verfügbar ist, statt eine leere oder defekte Study-Oberfläche darzustellen.

## Inhaltsbreite minimale Karten und deutlichere Popup-Titel

Minimale Bibliotheksraster reservieren weiterhin die vom Modul angeforderte Anzahl gleich breiter Spalten einschließlich leerer Positionen. Sichtbare Karten schrumpfen nun auf ihren Inhalt zuzüglich Innenabstand und bleiben in jedem skalierten Rasterplatz zentriert. Popup-Titel sind doppelt so groß und Titeldetails dreißig Prozent größer.

## Einheitliche Kartendetails der Bibliothek

Alle Bibliotheksebenen zeigen Definitionen nun über die gemeinsame Titel-Detail-Struktur des Popups, platzieren den Geltungsbereich neben dem Titel, verwenden standardisierte Schließen-Steuerelemente und SVG-Navigationssymbole und zeigen verknüpfte Definitionen einheitlich in der Vorschau. Gerichtete Varianten an Rasterrändern weichen nach oben aus, statt die nächste oder vorherige Zeile zu überlagern.

## Vollständige Kompositionen und stabile Study-Navigation

Kompositionsverweise der Bibliothek werden nun nach Darstellungsrolle zusammengeführt und behalten ihre festgelegten Positionen bei, sodass Partikel in derselben vollständigen Komposition bleiben, statt unter einer doppelten Überschrift zu erscheinen. Das Einklappen der Study-Unternavigation verwendet nun einen höhenabhängigen Hystereseschwellenwert, der verhindert, dass layoutbedingte Scrolländerungen die Hauptnavigation schnell öffnen und schließen.

## Bibliotheksverweise innerhalb einer Ebene

Bibliotheksschemas und Inhaltspakete können einen Eintrag ausdrücklich mit einem anderen Eintrag derselben Ebene verknüpfen. Solche Verknüpfungen werden nun standardmäßig als Komposition dargestellt, während gerichtete Varianten und ausdrücklich als alternative Schreibweisen markierte Beziehungen ihr bisheriges Verhalten behalten.

## Ausgewogene minimale Bibliotheksraster

Minimale Bibliotheksraster begrenzen ihre gesamte Diagrammbreite nun anhand der angeforderten Zeilengröße und skalieren Kartenhöhe, Innenabstand und Primärtext proportional. Ausdrückliche Leerstellen werden als ausgeblendete, dimensionierte Rasterzellen gerendert, sodass nachfolgende Kana in ihren vorgesehenen Spalten bleiben.

## Größerer Minimalinhalt mit getrennten Aussprachen

Minimale Bibliothekskarten zeigen ihren Primärinhalt nun in der doppelten bisherigen Größe. Aussprachen stehen in einer eigenen Zeile unter dem vergrößerten Inhalt, während lokalisierte Definitionen als separater Begleittext erhalten bleiben.

## Minimale Diagramme in voller Breite

Minimale Bibliotheksdiagramme nutzen nun die gesamte verfügbare Breite mit lückenlosen, gleich großen Zellen im Seitenverhältnis zwei zu eins. Karten wachsen mit ihren Zellen, Zeilen verwenden durchgehende Trennlinien und angeforderte Leerstellen zeigen gedämpfte Gedankenstriche, statt zu verschwinden.

## Adaptive einzeilige Popup-Überschriften

Popup-Titeldetails werden nun als benachbarte h4-Elemente statt innerhalb des h2-Titels gerendert. Das gemeinsame Popup misst nach dem Rendern die vollständige Überschrift, verkleinert zuerst den Titeldetailtext um bis zu fünfzig Prozent und danach den Haupttitel um höchstens dreißig Prozent. Nach dem Laden der Schrift und bei Größenänderungen wird die Anpassung wiederholt, damit die Zeile niemals umbricht.

## Verschachtelte untergeordnete Bibliothekskarten

Untergeordnete Beziehungen sind jetzt richtungsneutral. Die Bibliothek weist anhand des verfügbaren Platzes sichere Positionen zu, zeigt untergeordnete Karten auf einer undurchsichtigen, hervorgehobenen Fläche ohne unscharfen Inhalt und klappt verschachtelte Kindketten rekursiv bis zu vier Ebenen tief aus.

## Natürliches Scrollen der Bibliothek

Bibliotheksinhalte nehmen nun am natürlichen Scrollen des Dokuments teil, statt einen verschachtelten Inhaltsbereich zu verwenden. Ein Klick auf eine Karte außerhalb eines erweiterten untergeordneten Kartenbaums schließt diese Ansicht, bevor die Kartenaktion fortgesetzt wird.

## Fortschreitendes Ausklappen des Kindbaums

Wenn eine bereits eingeblendete untergeordnete Karte mit dem Zeiger berührt wird, zeigt sie nun ihre eigenen Nachkommen über denselben gerichteten Kartenmechanismus. Verschachtelte Bäume lassen sich schrittweise durch alle vier unterstützten Ebenen erkunden, ohne jeden Zweig gleichzeitig zu öffnen.

## Sichereres Erkunden von Karten und Popups

Ein ausgeklappter Kindbaum verarbeitet nun den ersten Klick auf sein übergeordnetes Element oder eine benachbarte Karte ausschließlich zum Schließen, ohne unerwartet Details zu öffnen. Kartenvorschauen verbinden mehrere Definitionen und kürzen sie bei Platzmangel mit Auslassungspunkten, während Detail-Popups alle Definitionen behalten. Popup-Titeldetails sind größer, und Titel zusammengesetzter Einträge stellen ihre geordneten Bestandteile als einzelne Deep Links dar.

## Deutlichere Links in zusammengesetzten Titeln

Deep-Links innerhalb von Popup-Titeln verwenden keine Unterstreichung mehr. Beim Darüberfahren und bei Tastaturfokus erhalten sie nun einen stärkeren Akzentrahmen, einen getönten Hintergrund und einen Fokusring, sodass jede anklickbare Titelkomponente klar erkennbar ist.

## Einheitliche Bibliothekslinks und gemerkte Lernziele

Beziehungslinks führen nun einheitlich direkt zu den Details des verknüpften Eintrags, einschließlich umgekehrter „Verwendet von“-Links. Sprachwechsel verwenden die zuletzt geöffnete untergeordnete Lernseite statt des mehrsprachigen Übersichtsbereichs, und in den Spracheinstellungen ist keine Sprachschaltfläche als aktiv markiert.

## Stabile Kindanzeigen und ausgeblendete Einträge

Das Loslassen nach langem Drücken schließt untergeordnete Karten nicht mehr, bevor sie erreichbar sind, und das Öffnen von Popups wird serialisiert, um doppelte Dialoge zu verhindern. Inhaltseinträge können nun aus der direkten Ansicht ausgeblendet werden, bleiben aber für Verweise und Detaillinks verfügbar; ein ausgeblendetes übergeordnetes Element blendet auch seine Nachkommen aus. Detailüberschriften untergeordneter Elemente nennen ihren Elterneintrag.

## Kartenplätze in acht Richtungen

Eingeblendete untergeordnete Bibliothekskarten können nun jeden geraden und diagonalen Platz um ihre übergeordnete Karte belegen. Die rasterrandbewusste Platzierung verhindert nach Möglichkeit, dass Karten über den sichtbaren Inhalt hinausragen. Zusätzlicher Abstand im Browser und sichtbarer Überlauf im Minimalraster halten Kartenränder von den umgebenden Kanten fern.

## Zuverlässige Platzierung untergeordneter Karten

Beim Einbinden der Bibliothek wird keine fehlende Richtung der übergeordneten Karte mehr an die Rasterrandplatzierung übergeben. Untergeordnete Karten auf Wurzelebene beginnen mit der Liste unterstützter Richtungen, und die Platzierungsprüfung weist Richtungswerte, die keine Zeichenketten sind, nun sicher zurück.

## Begrenzte Bäume untergeordneter Karten

Die Platzierung untergeordneter Karten bevorzugt nun oben, unten, links und rechts vor diagonalen Plätzen. Die erste Ebene reserviert nach Möglichkeit genügend Rasterraum für ihren tiefsten Zweig, Nachfahren verfolgen ihre kumulative Position innerhalb des Bibliotheks-Widgets, und das Öffnen eines Kartenbaums schließt jeden zuvor angehefteten Baum.

## Dauerhaft fokussierte untergeordnete Zweige

Beim Bewegen des Mauszeigers auf eine verschachtelte untergeordnete Karte bleibt nun der vollständige Pfad der übergeordneten Karten geöffnet, während die nächste Ebene dieser Karte eingeblendet wird. Benachbarte Zweige werden vorübergehend ausgeblendet, um Platz zurückzugewinnen. Beim Zurückkehren zu einem anderen Zweig wird der fokussierte Pfad aktualisiert, ohne dass der Baum in den Abständen zwischen Karten zusammenklappt.

## Commits

- [1d65413](https://github.com/Cognis-Labs-HQ/Cognis/commit/1d65413154f89efbd91422bbfdc94bc8196e9f16)
- [656b59f](https://github.com/Cognis-Labs-HQ/Cognis/commit/656b59feef1ff344ce911a042eecae788a228cc4)
- [e183481](https://github.com/Cognis-Labs-HQ/Cognis/commit/e18348130104134eaa7962aa3020a03a22325e86)
- [ba25e44](https://github.com/Cognis-Labs-HQ/Cognis/commit/ba25e4481d6c71a35ebe2ecc8d0143b85f0125b3)
- [ef782975](https://github.com/Cognis-Labs-HQ/Cognis/commit/ef782975)
- [68bd7478](https://github.com/Cognis-Labs-HQ/Cognis/commit/68bd7478dbf6343109087bd83a9fba643452a838)
- [eeabc5e1](https://github.com/Cognis-Labs-HQ/Cognis/commit/eeabc5e1231e3de246a14ee4ff49582a7169768c)
- [2cc37134](https://github.com/Cognis-Labs-HQ/Cognis/commit/2cc371343c54afed45e545d523a751cad101be3c)
- [ad01aa56](https://github.com/Cognis-Labs-HQ/Cognis/commit/ad01aa561321b7db5982b0fbfe7f1b28ed11347b)
- [9fe9af00](https://github.com/Cognis-Labs-HQ/Cognis/commit/9fe9af0021f9a093ba432fca9761368e8df0e5f6)
- [51c727ea](https://github.com/Cognis-Labs-HQ/Cognis/commit/51c727eaeb923bd3d4a569ed9e924945f56e286c)
- [17756b2f](https://github.com/Cognis-Labs-HQ/Cognis/commit/17756b2fb83d82f25bf7c349f63170fc738db995)
- [86d3162c](https://github.com/Cognis-Labs-HQ/Cognis/commit/86d3162c19544032fa2ccc6d55f80de58f9495fb)
- [77611b4e](https://github.com/Cognis-Labs-HQ/Cognis/commit/77611b4ed1c6d7afa1221f966cf80ec9b1292316)
- [4ff6b5ec](https://github.com/Cognis-Labs-HQ/Cognis/commit/4ff6b5ec7825a19626c371347c04c43785971216)
- [1190320b](https://github.com/Cognis-Labs-HQ/Cognis/commit/1190320be506d0c74feefa441a4188d05d3892ae)
- [5bb5607e](https://github.com/Cognis-Labs-HQ/Cognis/commit/5bb5607ec3cd60ff7ff2d1329dd66cb4cfc907a8)
- [83297da5](https://github.com/Cognis-Labs-HQ/Cognis/commit/83297da5d62dcbaa8166af88531432b8468d721e)
- [164297bd](https://github.com/Cognis-Labs-HQ/Cognis/commit/164297bda76fa834f5a0e988260c7b2580ef4b87)
- [31da2e2f](https://github.com/Cognis-Labs-HQ/Cognis/commit/31da2e2fcd3284f1c2edd0da12a22c416c374b88)
- [13754134](https://github.com/Cognis-Labs-HQ/Cognis/commit/13754134d1595372336cea85a1d1f85bb4da2a9c)
- [f4ad7320](https://github.com/Cognis-Labs-HQ/Cognis/commit/f4ad732066d653312f37bba8a08c61d7d37d3522)
- [753a02dc](https://github.com/Cognis-Labs-HQ/Cognis/commit/753a02dc9171670c41d02b9665e076422f3fc3b6)
- [82bb97c0](https://github.com/Cognis-Labs-HQ/Cognis/commit/82bb97c02aac759f995373a1e9c1234d69b61d57)
- [44617c98](https://github.com/Cognis-Labs-HQ/Cognis/commit/44617c980ed07d896925f99bd27dd0ca57d2d831)
- [95b3065d](https://github.com/Cognis-Labs-HQ/Cognis/commit/95b3065d2b20baf702b1b7ffb669cdd5351caf70)
- [f1ad82df](https://github.com/Cognis-Labs-HQ/Cognis/commit/f1ad82df827fe30850bf4516aa790304a985d925)
- [893aece3](https://github.com/Cognis-Labs-HQ/Cognis/commit/893aece39d60e4bd4c84f7a809c504811f630d13)
- [7387683a](https://github.com/Cognis-Labs-HQ/Cognis/commit/7387683a1faa0f8efd9d27a524f75b43eb81dbd4)
- [7f34d0c9](https://github.com/Cognis-Labs-HQ/Cognis/commit/7f34d0c98a4b693a14f5c864bed07ace40bf79da)
- [c3a7f703](https://github.com/Cognis-Labs-HQ/Cognis/commit/c3a7f703c729ca3490a6bc16ad01ae7eebe02674)
- [84a349c7](https://github.com/Cognis-Labs-HQ/Cognis/commit/84a349c7fc4c1efb389ffd09b2ddd6654c2ecaba)
- [08110121](https://github.com/Cognis-Labs-HQ/Cognis/commit/08110121dca4e9ec80cf8d358c71e1b01212c2de)
- [7f0e9fdb](https://github.com/Cognis-Labs-HQ/Cognis/commit/7f0e9fdb)
- [da4188fe](https://github.com/Cognis-Labs-HQ/Cognis/commit/da4188fe99113db1a13c31e22d0703327fc7f540)
- [abfaddbf](https://github.com/Cognis-Labs-HQ/Cognis/commit/abfaddbf0bafef8e9e08812cebdba2ee4557fbaf)
- [7f007d44](https://github.com/Cognis-Labs-HQ/Cognis/commit/7f007d4430f88b1ae7d37fb3daf346adc5f2c9b3)
- [8ce047ac](https://github.com/Cognis-Labs-HQ/Cognis/commit/8ce047ac3710628db7b52b16bc0169ab7fadd583)
- [8373c151](https://github.com/Cognis-Labs-HQ/Cognis/commit/8373c15186eb49298e4d961f11d273d06b3146ef)
- [a2da40bf](https://github.com/Cognis-Labs-HQ/Cognis/commit/a2da40bf07e7651088e6444259aa536755c14b8a)
- [1d47e019](https://github.com/Cognis-Labs-HQ/Cognis/commit/1d47e019124ef7e2e90c05f96a46ff0d3282912e)
- [e4fa5f2a](https://github.com/Cognis-Labs-HQ/Cognis/commit/e4fa5f2ac0669a6ec93fe00b2a926283b2ac8ab4)
- [b1e6e962](https://github.com/Cognis-Labs-HQ/Cognis/commit/b1e6e96288911f324cc48952431887ce89246ae1)
- [8a67d78e](https://github.com/Cognis-Labs-HQ/Cognis/commit/8a67d78e78cf9a52a989ebc56fb01b8f90b49193)
- [8a4b37c5](https://github.com/Cognis-Labs-HQ/Cognis/commit/8a4b37c5220db3e29036ba17d768910f7eb118cf)
- [e4db7639](https://github.com/Cognis-Labs-HQ/Cognis/commit/e4db7639cb19c88fef26ebd55f23eb6e6095ab17)
- [00072b1f](https://github.com/Cognis-Labs-HQ/Cognis/commit/00072b1fcccbf14a647f48d5fb5b293f72e27332)
- [e1584351](https://github.com/Cognis-Labs-HQ/Cognis/commit/e1584351d43f0337d3aba919e5c369a50be4f69e)
- [dfbc9b22](https://github.com/Cognis-Labs-HQ/Cognis/commit/dfbc9b22569c7f426d08f075c8ac79e80fa7e165)
- [98eb5217](https://github.com/Cognis-Labs-HQ/Cognis/commit/98eb5217e93fcd9cf765f3461e78080d9e33fd74)
- [a6bb913b](https://github.com/Cognis-Labs-HQ/Cognis/commit/a6bb913bf18284dd5bd7f172994ec41fdacb78d6)
- [8ec16aee](https://github.com/Cognis-Labs-HQ/Cognis/commit/8ec16aee27bb9ba6e4d3b1461d30bb9b1003020f)
- [c7a41d2c](https://github.com/Cognis-Labs-HQ/Cognis/commit/c7a41d2c3933afa6502a7633b1f6089c816e7c8e)
- [c2b80b54](https://github.com/Cognis-Labs-HQ/Cognis/commit/c2b80b5468ee6acfcb2e525fcdbcfd6df7865f5d)
- [d07ce255](https://github.com/Cognis-Labs-HQ/Cognis/commit/d07ce255cc0f65d5402f264a21574155c11c853d)
- [92da28e2](https://github.com/Cognis-Labs-HQ/Cognis/commit/92da28e2f01c823c14ca435c44d3f47cfebede9e)
- [0e6be2ce](https://github.com/Cognis-Labs-HQ/Cognis/commit/0e6be2ce8afb587a41cfc189aac8b4c4a6016a48)
- [be55dd47](https://github.com/Cognis-Labs-HQ/Cognis/commit/be55dd4775bda31fb70926e64af09fb322fdd50d)
- [fc3379e4](https://github.com/Cognis-Labs-HQ/Cognis/commit/fc3379e48419678433fd00b250ff6bf45bf9a578)
- [e4b572ee](https://github.com/Cognis-Labs-HQ/Cognis/commit/e4b572ee)
- [764c109d](https://github.com/Cognis-Labs-HQ/Cognis/commit/764c109dfa6530c33bddf8d8deaafff2e2ea7f48)
- [5ab1b885](https://github.com/Cognis-Labs-HQ/Cognis/commit/5ab1b8853aaf5253230f4ab535e5c68fd6ccc0aa)
- [fff72d38](https://github.com/Cognis-Labs-HQ/Cognis/commit/fff72d38bc86a30fa95db9323f05494a747b43ea)
- [26a42897](https://github.com/Cognis-Labs-HQ/Cognis/commit/26a428979ae39d94ffd502733fee6ad2306a618f)
- [9d118560](https://github.com/Cognis-Labs-HQ/Cognis/commit/9d118560c653e18847ed65945ddf363928cac172)
- [8c21c0d2](https://github.com/Cognis-Labs-HQ/Cognis/commit/8c21c0d2380f55b3b7d5c235c8f894080ea7f0fa)
- [16f02b7b](https://github.com/Cognis-Labs-HQ/Cognis/commit/16f02b7bf334a42884dc78ffc46ff7baec857722)
- [1490dd84](https://github.com/Cognis-Labs-HQ/Cognis/commit/1490dd848112eab3f7aa82465c5c5c297818b719)
- [4c928d09](https://github.com/Cognis-Labs-HQ/Cognis/commit/4c928d092a3a5dbc3589ea1dab0fbfc89bd35403)
- [d1ce3c69](https://github.com/Cognis-Labs-HQ/Cognis/commit/d1ce3c69bb04c5b061943a8e909350284d31e45d)
