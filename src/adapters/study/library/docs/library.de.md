# Bibliotheksadapter

## Erweiterbare Browseraktionen

Der Library-Anbieter veröffentlicht `study:library:client` über seinen lebenszyklusgebundenen ctx. Jede Gateway-Clientoperation führt `study:library:<clientFunction>` mit `before`, `execute` und `after` aus. Eine Erweiterung von `study:library:createLibraryEntry` bei `before` kann `input.args` (die Positionsargumente der Clientfunktion) prüfen oder ändern beziehungsweise vor der Anfrage einen Fehler zum Ablehnen auslösen. `after` erhält `data.result` und kann den Rückgabewert anpassen. Serverseitige Berechtigungsprüfung und Validierung gelten weiterhin. Lesen, Wörterbuchauflösung, Import, Veröffentlichungsanfragen und Medienänderungen verwenden dieselbe Grenze. Beim Entfernen werden laufende Anfragen abgebrochen und Fähigkeiten, Abläufe und Hooks entfernt; veraltete Aufrufe werden abgewiesen. Erneutes Aktivieren registriert neue Aktionen.

Gruppierte Beziehungsnamen werden als Daten behandelt, einschließlich constructor, ohne geerbte Objekteigenschaften zu verwenden.

JSON-Änderungen der Bibliothek akzeptieren höchstens 5 MiB und weisen größere Datenströme vor einer Änderung mit HTTP 413 zurück. Kartenfeld-JSON und seine normalisierte Suchform haben jeweils ein Budget von 50.000 UTF-8-Bytes; dadurch bleibt Platz für Titel und Tags im Suchtext. Audioanhänge benötigen einen exakten Uploadpfad; Pfadwechsel und verschachtelte Pfade werden vor dem Speicherzugriff abgewiesen. Erstellen und Bearbeiten verwenden denselben kanonischen Referenzschreiber für Gruppen, Positionen und gewählte Transformationen. Fehler beim Laden der Speicherorte erscheinen als lokalisierte Meldung; Antworten abgebrochener Seiten aktualisieren keine aktuellen Bedienelemente.

Paketressourcen verwenden study_library_asset_chunks mit einer SHA-256-Kennung aus Herausgeber, Paket, Version und vollständigem Ressourcenpfad sowie einer ganzzahligen Position. Öffentliche Ressourcen-URLs und Originalbytes bleiben erhalten. Ein Paketindex begrenzt das Entfernen. Schemas behalten ihre Schema-/Versionskennung und verwenden ein Basisfragment mit study_library_schema_parts. Beide Inhalte verwenden Unicode-sichere Fragmente mit höchstens 60.000 UTF-8-Bytes. Lesezugriffe setzen Fragmente geordnet zusammen; der Import ersetzt sie in seiner bestehenden Transaktion. Versionskonflikte, Ersetzen durch den alleinigen Herausgeber, Zurückrollen und kürzere Ersetzungen behalten ihre Semantik.

Einfache Referenzen behalten ihren bestehenden Schlüssel. Gruppierte Platzierungen verwenden study_library_reference_groups mit einer deterministischen reference_id einschließlich Gruppe und Position. Die Schemainitialisierung verschiebt vorhandene gruppierte Zeilen transaktional vor weiteren Schreibvorgängen; bei Fehlern bleibt der bisherige Graph für einen erneuten Versuch erhalten. Lesen, Rückreferenzen, Löschen, Bearbeiten und Bereinigung verwenden beide aktiven Kantenspeicher. Importierte Referenzen werden in Gruppen von 500 Quell-IDs bereinigt, wobei Anbieteränderungen erhalten bleiben. Benachrichtigungen über neue Karten erfolgen erst nach Bestätigung der äußeren Erstellungstransaktion.

Für den Start externer Module gilt standardmäßig ein begrenztes Zeitfenster von zwei Minuten, damit validierte Inhaltspakete vor der Veröffentlichung ihrer Fähigkeiten vollständig importiert werden können. Ein explizites Zeitlimit des Hosts bleibt wirksam. Bei Fehlern oder Zeitüberschreitung werden registrierte Beiträge entfernt; das Modul bleibt nicht verfügbar. Mitgelieferte Audiodateien werden bei erneuter Aktivierung aus dem versionierten Dateispeicher wiederverwendet; fehlende Dateien werden über das Files-Gateway neu angelegt. Bibliothekseinträge und Beziehungen werden weiterhin abgeglichen, auch bei unveränderten Paketen.

Vorschläge im Karteneditor stehen in einer eigenen Zeile, damit Eingabe und Aussprache-Speichern stabil bleiben. Die Auswahl eines Wörterbuchergebnisses übernimmt unaufgelösten Text als kanonische Zeichenreferenzen, einschließlich ausgeblendeter Schreibeinheiten wie kleinem っ. Bereits übernommene Zusammensetzungen bleiben erhalten; ausgeblendete Einheiten erscheinen nicht in der Übersicht.

Karteneditoren bestätigen den Abbruch vor dem Verwerfen von Änderungen. Karussellauswahlen fügen wiederholte Kartenplatzierungen hinzu; Ziehen ordnet einzelne Platzierungen neu. Aussprachevorschauen für Sätze zeigen jede Quellkomponente in einem Rahmen; redundante Eingaberückmeldungen entfallen. Karussellvorschauen zeigen nur die primäre Aussprache und Definition innerhalb des sichtbaren Bereichs.

Diagrammraster reservieren innen einen Kartenabstand, damit Karten- und Fokusrahmen vollständig sichtbar bleiben. Die räumliche Kindplatzierung misst die verbleibende Kapazität in jeder Richtung, reserviert nur die vom aktiven Vorfahrenpfad belegten Koordinaten, sodass Nachkommen die Plätze cursorbedingt ausgeblendeter Alternativzweige wiederverwenden können und bevorzugt eine Richtung, die den Nachkommenzweig aufnehmen kann, bevor sie auf die größte sichtbare Kapazität zurückfällt.

## Verbraucherdefinierte Schemata

Der Bibliotheksadapter speichert generische, verknüpfte Lerninhalte. Verbraucher registrieren unveränderliche, versionierte Schemata über die ctx-Fähigkeit `study:library`. Ein Schema beschreibt Sprache, Ebenen, typisierte Felder und gerichtete Beziehungen; Begriffe wie Alphabet, Wort oder Satz sind nicht im Adapter festgelegt.

Beziehungen bestimmen Zielebene, Kardinalität, Reihenfolge und optionalen Resolver. Jeder Schreibvorgang prüft Felder, Schemaversion, Ziele, Sichtbarkeit und Kardinalität. Alternative Definitionen werden als vom Verbraucher deklarierte Ebenen und Beziehungen modelliert.

Ebenen können sich in einer Beziehung selbst als Ziel verwenden, sodass ein Eintrag einen anderen Eintrag derselben Ebene ausdrücklich erweitern kann. Beziehungen innerhalb derselben Ebene werden standardmäßig als Komposition dargestellt; nur als Varianten markierte oder ausdrücklich `alternateSpelling` zugewiesene Beziehungen verwenden die Darstellung als alternative Schreibweise.

## Auflösung, API und UI

Verschachtelte Kinder bleiben als vollständiger Teilbaum verfügbar: Beim Überfahren oder Fokussieren eines aufgeklappten Kindes werden alle direkten Kinder angezeigt, ohne Geschwisterpfade einzuklappen. Der Hinweis zum langen Drücken belegt beim Darüberfahren eine abgeschnittene Zeile im reservierten Kartenfußbereich, sodass umbrochener Hilfetext den Vorschauinhalt nicht verdeckt. Untergeordnete Karten behalten beim Darüberfahren eine vollständig deckende, erhöhte Oberfläche, sodass darunterliegende Karten nicht durchscheinen.

Der `grapheme`-Resolver nutzt Unicode-Grapheme; `longest-match` verarbeitet ausdrücklich getrennte Blöcke. Beide liefern Vorschläge und ungelöste Einheiten, ohne still Einträge anzulegen. Lookup-Anbieter werden über `registerLookupProvider` beigetragen, liefern gewichtete Vorschläge mit Herkunft und lassen sich über den zurückgegebenen Callback entfernen. Erstellen, Auflösen und Nachschlagen laufen durch benannte ctx-Flows.

Das Study-Gateway bietet Schemaerkennung, Auflistung, Erstellung, Details, beidseitige Verfolgung, Auflösungsvorschau und Lookup-Vorschläge. Die schemagesteuerte Oberfläche blendet interne Definitions- und Partikelebenen beim direkten Browsen aus. Sichtbare Ebenen verwenden Reiter, Metadatenfilter, Eintragskarten, Metadaten-Pills und Bereichssymbole. Wiederverwendbare Pop-up-Details zeigen Definitionen und Bedeutungen unter der größeren Eintragsüberschrift. Erkannte Bestandteile, einschließlich Satzpartikeln, erscheinen als navigierbare Unterfelder innerhalb dieser Überschrift statt in einem separaten Komponentenabschnitt; Partikeldetails bleiben schreibgeschützt. Resolvergestützte Referenzen erscheinen ausschließlich als navigierbare hervorgehobene Felder; redundante Beziehungsüberschriften und Kompositionsoperatoren entfallen. Bezeichnungen von Bestandteilen und Aussprachen werden über den Vertrag für Titel- und Sekundärtitelelemente des Pop-ups dargestellt; der Detailinhalt wiederholt sie nie in eigenen Aussprache- oder Komponentencontainern. Verwendungsbeispiele erscheinen nur bei einem Eintrag, auf den ein geordneter Datensatz direkt verweist, und niemals transitiv über einen anderen verwandten Eintrag. Metadatenfilter erscheinen als sofort angewendete Pills und verwenden die Detailgruppen des Schemas, wenn ein Modul sie bereitstellt. Global-, Benutzer- und Klassenzugriff wird weiterhin am Service-Rand durchgesetzt. Die Metadatenfilterung wertet jetzt nur Basiskarten mit serialisierten Filterwerten aus. Dadurch übergeben schwebende Variantenkarten keinen undefinierten Wert mehr an die JSON-Verarbeitung. Zeichenkarten mit Varianten zeigen beim Darüberfahren jetzt einen lokalisierten Hinweis zum Gedrückthalten und öffnen ihre untergeordneten Karten erst nach Erreichen der Halteschwelle. Die Gruppe bleibt geöffnet, solange der Fokus im übergeordneten Element oder seinen Kindern liegt, und schließt bei Fokusverlust. Variantenbeziehungen werden nicht zusätzlich in einem eigenen Detailabschnitt wiederholt. Geöffnete untergeordnete Karten verwenden einen grünen Richtungspfeil und grünen Rahmen; ihr Abstand zum übergeordneten Element entspricht dem Abstand zwischen normalen Karten.

Inhaltseigentümer, Administratoren und Eigentümer können mehrere sichtbare Einträge auswählen und sie mit ihren Beziehungen dauerhaft löschen. Gelöschte Modulinhalte werden beim Aktivieren des Moduls wiederhergestellt, wenn sie fehlen. In der Löschbestätigung können stattdessen die Inhalts-Hashes gesperrt werden, damit identische Datensätze nicht erneut importiert werden. Mehrfachauswahlaktionen verwenden nach einem langen Drücken die schwebende Aktionsleiste des Page Composers; ein normaler Kartenklick oder die Schließen-Aktion beendet den Auswahlmodus. Beziehungslinks wechseln zur durchsuchbaren Ebene des referenzierten Eintrags und verwenden die gemeinsame Zielhervorhebung. Definitionsreferenzen liegen direkt auf dem angezeigten Text, und nur im Schema deklarierte Resolver-Beziehungen erzeugen Bestandteilsfelder, wodurch doppelte oder unpassende Schriftsystem-Links vermieden werden. Dunkle Audio-Steuerelemente neutralisieren ausdrücklich die Sättigung des nativen Bedienfelds.

Minimale Raster leiten aus `grid.rowSize` eine begrenzte Diagrammbreite und proportionale Kartenskalierung ab; ausdrückliche Leerelemente bleiben dimensionierte Rasterzellen, damit Diagrammspalten nie zusammenfallen.

## Deklarative Inhaltspakete

Installierte Sprachpakete rufen `inspectContentPack(root)` zur Prüfung oder `ingestContentPack(root)` zur Installation einer reinen Datenbibliothek auf. Das Verzeichnis enthält `manifest.json`, eine referenzierte Schemadatei und ein Inhaltsverzeichnis mit Ebenen-Unterverzeichnissen. Dateien enthalten Datensatzarrays mit stabilen IDs und ausdrücklichen Beziehungen. Cognis prüft den vollständigen Graphen, erzeugt Namensraum-IDs, erfasst Digest und Beleg und schreibt Schema, Einträge und Kanten atomar. Eintrags-IDs bleiben über Paketversionen hinweg stabil, und die Installation aktualisiert den stabilen Datensatz direkt. Eine räumliche Hierarchie erfordert `child: true`; `variant: true` kann zusätzlich eine alternative Form kennzeichnen, aktiviert oder deaktiviert das Aufklappen jedoch nicht. Mit `hidden: true` markierte Datensätze erhalten niemals eine räumliche Platzierung, selbst wenn ihre Beziehung ein Kind ist. Der Browser weist jedem ausdrücklich deklarierten Kind einen begrenzten Rasterplatz zu und klappt Kindketten rekursiv bis zu vier Ebenen tief aus. Datensätze, die ausschließlich als Kompositionsziele dienen, setzen `hidden: true`; sie bleiben in Details auflösbar und tief verlinkt, erscheinen aber nie als Diagrammkarte. Untergeordnete Datensätze verweisen auf ihr tatsächliches übergeordnetes Element und bleiben unabhängige Bibliothekseinträge. Zeigerbenutzer können auf eine schwebende Variante wechseln und deren Details öffnen. Eine Ebene kann ein `grid` mit `rowSize` sowie einer `items`-Folge aus Inhaltsdatensatz-IDs, numerischen `displayId`-Werten oder ausdrücklichen `{ "blank": true }`-Leerstellen (`null` bleibt unterstützt) definieren; der Browser erhält diese Diagrammpositionen und skaliert jede Karte auf die angeforderte Zeilenbreite. Für berechtigte Inhaltseigentümer und Administratoren bleiben Auswahlkästchen verborgen, bis eine Karte rechtsgeklickt wird; danach erscheinen sie bibliotheksweit mit Unterstützung für das dunkle Design. Der Autorenvertrag steht in `study-language-framework.de.md`. Metadatenfiltergruppen können `required: true` angeben, damit stets ein Tag ausgewählt bleibt, und mit `defaultTag` ein vom Modul bestimmtes Tag vorauswählen; ein Filter mit nur einem dargestellten Tag wählt dieses automatisch aus. Ebenen können `minimal: true` setzen, um nur die primäre Bezeichnung jedes Eintrags in einer kompakten Karte darzustellen, während normale Klick-, Langdruck-Varianten- und Auswahlinteraktionen erhalten bleiben. Satzdatensätze in Inhaltspaketen müssen vollständig durch ihre geordneten Verweise auf lexikalische Einheiten und Partikeln dargestellt werden; Importe weisen Bezeichnungen mit nicht verknüpftem Text zurück. Datensätze können `hidden: true` setzen, damit sie weiterhin referenzierbar und in Detail-Popups verfügbar bleiben, jedoch zusammen mit allen Nachkommen nicht direkt in der Bibliothek erscheinen.

## Lokalisierte Definitionen

Jede Ebene mit der semantischen Rolle `definition` deklariert ihr moduleigenes Zeichenkettenpräfix sowie ihre Felder für Schlüssel und lokalisierten Text. Definitionen werden nur beim Bearbeiten der Einträge verwaltet, die sie benötigen; sie sind nicht als eigenständige Bibliotheksbereiche direkt sichtbar oder bearbeitbar. Englisch bleibt der erforderliche Ausgangstext, erzeugte Schlüssel bleiben im Definitionsdatensatz und die optionale Fähigkeit `localization:translateString` kann fehlende Sprachen ergänzen.

## Aussprache und Audio für Schreibeinheiten

Schreibzeichen-Schemas deklarieren die Standardfelder `pronunciation` (`stringList`) und `audio` (`audio`). Anbieter legen fest, ob Aussprachewerte erforderlich sind; Quellzeichen mit unbekannten Lesungen dürfen ein optionales Aussprachefeld auslassen, ohne eine Lesung zu erfinden. Erforderliche Aussprachefelder weisen fehlende Werte weiterhin zurück. Inhaltspakete liefern MP3-, Ogg-, WAV-, WebM- oder M4A-Dateien als authentifizierte Paketressourcen. Die Bibliothek speichert diese Dateien über das Datei-Gateway in ihrem komponentenverwalteten Namensraum `study-library-audio`. Dauerhafte Speicherung, Kontingente und physische Dateiverwaltung bleiben Aufgabe des Datei-Gateways; jede Wiedergabeanfrage prüft weiterhin den Bereich des Eintrags. Aussprachen von Zeichen und alternativen Zeichen erscheinen auf Karten und in Detailtiteln neben der Schreibeinheit; Aussprachen von Wörtern und Sätzen bleiben unter ihrem Text. Ein Modul kann ein bedeutungstragendes Einzelzeichenwort modellieren, indem ein Datensatz mit der Rolle `lexicalUnit` genau eine Zeichenbeziehung erhält. Die Zeichendetails führen anschließend diese eingehenden Wortbeziehungen auf, ohne dass die Bibliothek Inhalte selbst erzeugt. Die Aussprache einer Schreibeinheit neben einem Pop-up-Titel verwendet den maskierten Vertrag für sekundäre Titel mit kleinerer Schrift und normaler Stärke. Audioflächen deaktivieren erzwungene Farbersetzung und neutralisieren im dunklen Modus die Sättigung nativer Steuerelemente.

## Metadatenfiltergruppen

Ein Abzeichenfeld ist standardmäßig filterbar. Anbieter können außerdem `detail.filterable: true` für andere primitive oder lokalisierte Metadatenfelder setzen, um deren Werte als Filter für Lernende bereitzustellen. Filterbare Felder können mit `detail.group` zusammengehörige Filter gruppieren und mit `detail.exclusive` die Auswahl steuern. Wenn jedes Feld einer Gruppe `exclusive: true` angibt, löscht die Auswahl einer Pille die vorherige Gruppenauswahl. Der Standardwert `false` erlaubt mehrere ausgewählte Pillen. Alle Felder einer benannten Gruppe müssen dieselbe Einstellung verwenden.

## Authentifizierte Audiowiedergabe

Der Study-Gateway-Client lädt Eintragsaudio über den authentifizierten API-Client und übergibt dem Player eine temporäre Objekt-URL. Beim Schließen des Detailfensters wird die URL widerrufen. Die nativen Player-Steuerelemente unterstützen helle und dunkle Farbschemata und folgen dem aktiven Anwendungsthema.

## Strukturierte Anzeige

Die lokalisierten Metadaten jeder Ebene bestimmen ihren sichtbaren Namen. Nicht-Zeichen-Ebenen können `displayDefinition: true` setzen; dann sind eine erforderliche Definitionsbeziehung und eine solche Referenz pro importiertem Eintrag vorgeschrieben. Sprachmodule können über `study:library:composeEntryDetail` eine zusammengesetzte Satzdefinition einschließlich sprachspezifischer Partikelwirkungen liefern. Cognis erfindet dabei keine Sprachinhalte. Nur deklarierte, nicht leere und sichtbare Felder werden generisch angezeigt. Raster akzeptieren Datensatz-IDs, numerische `displayId`-Werte und `{ "blank": true }` als Leerplatz.

Definitionseinträge können nie direkt geöffnet oder verlinkt werden; sie liefern ausschließlich lokalisierten Text für andere Einträge. Sichtbare Übersetzungen werden nur in der aktiven Oberflächensprache angezeigt. Resolver-Beziehungen unterscheiden mit `presentationRole` zwischen `composition`, `alternateSpelling` und `pronunciation`, sodass vollständige Wortlesungen nicht als mehrdeutige Zeichenfolge erscheinen.

Enthält eine Zusammensetzung genau einen Eintrag mit derselben Bezeichnung wie der aktuelle Eintrag, wird der doppelte Zusammensetzungsblock ausgeblendet und dessen Deep-Link ersetzt stattdessen die Pop-up-Überschrift.

Das Page-Composer-Widget umschließt nun das Bibliotheksschema passgenau und bleibt auf die verfügbare Breite begrenzt, sodass ungenutzte Widget-Breite keinen horizontalen Überlauf erzeugt.

Beim Löschen werden die endgültige Beziehungskaskade ermittelt und alle betroffenen Einträge innerhalb derselben Transaktion autorisiert. Eine gleichzeitig hinzugefügte Beziehung kann die Löschung daher nicht über die für den Akteur autorisierten Inhalte hinaus erweitern.

Bei lexikalischen Einheiten und geordneten lexikalischen Folgen erscheinen Beziehungen mit der Darstellung `alternateSpelling` als navigierbare Zweitschreibweisen direkt unter der primären Detailüberschrift. Strukturelle Kinder oder Variantenkinder werden im Detailinhalt nicht erneut als Abschnitt für alternative Schreibweisen aufgeführt.

Eine Aussprache, die mit der primären oder einer sekundären Schreibweise identisch ist, wird nur einmal angezeigt. Aussprachetext bleibt einfacher Titel-Metadatentext und wird nicht heuristisch in Links zu ähnlich beschrifteten Schreibeinträgen umgewandelt; Beziehungslinks stammen weiterhin ausschließlich aus deklarierten Bibliotheksreferenzen.

## Aktualisierungen von Inhaltspaketen

Paketaktualisierungen entfernen vom Herausgeber ausgelassene Einträge, da ein installierter Anbieter für seinen Namensraum maßgeblich ist. Ein Manifest darf `pruneOmittedRecords` nur dann ausdrücklich auf `false` setzen, wenn es absichtlich einen unvollständigen Datensatz veröffentlicht.

## Administration und Lernseiten

`/study/library` ist ein Dateneditor ausschließlich für Administratoren. Das Seitenmenü gruppiert alle Datensätze der ausgewählten Sprache nach Schema und Ebene, einschließlich Definitionen und Beziehungen. Beim Auswählen einer Ebene wechselt der aktive Menüstatus sofort und eine übersichtliche Zeilenliste erscheint. Ein Klick auf eine Zeile öffnet eine schreibgeschützte Variante des schemagesteuerten Bearbeitungsfensters; ein Rechtsklick aktiviert die Mehrfachauswahl, während der kleine themengerechte Stift die bearbeitbare Variante öffnet.

Lernebenen stehen im Seitenmenü Erkunden unter `/study/explore/<ISO-Sprache>/<navigationSlug>`. Module können pro Ebene einen eindeutigen `navigationSlug` angeben; andernfalls gilt die Ebenen-ID. Bibliothek und Anfragen behalten ihre Routen. Nur Satzvorschauen kürzen lange Titel und Definitionen.

## Fokussierte Karten und Bearbeitung

Lernkarten bleiben bewusst knapp: Hauptbezeichnung und Aussprache stehen in einer Zeile, daneben erscheint nur das Bereichssymbol. Definitionen, Metadaten, Beziehungen und weitere Inhalte bleiben im Detailfenster, wo tiefe Verknüpfungen ohne doppelte Abschnitte funktionieren.

Das administrative Bearbeitungsfenster leitet seine Steuerelemente aus den Feld- und Beziehungsschemata der jeweiligen Ebene ab, statt Roh-JSON anzuzeigen. Lokalisierte Texte, Listen, boolesche Werte, Zahlen, Zeichenketten und Beziehungsziele erhalten passende Eingaben. Der Schließschutz verfolgt geänderte Felder, bevor das Fenster verworfen werden darf.

## Vom Anbieter gesteuerte Editor-Verträge

Jedes bearbeitbare Feld deklariert seine Eingabeart und alle lokalisierten Bezeichnungen im Anbieter-Schema. Unveränderliche Klassifizierungen bleiben nach der Erstellung gesperrt; Audioauswahl und Upload sind auf den Sprachpräfix des Files-Gateway-Namensraums beschränkt. Zusammensetzungen müssen auf die nächstgelegene verfügbare Ebene verweisen: 日本語 verweist auf 日本 und 語, während 日本 auf 日 und 本 verweist.

Schaltflächen für verwandte Einträge wiederholen ihre Bezeichnung nicht mehr in einer Hover-Einblendung. Vokabellinks enthalten die vom Anbieter gelieferte Aussprache, sodass eine gültige lexikalische Einheit mit einem Zeichen wie `人 ひと` vom Schriftzeichen-Datensatz `人` unterscheidbar bleibt, ohne bedeutungsvolle Ein-Zeichen-Wörter auszublenden. Variantenhinweise reservieren eine kompakte untere Ecke der Karte, statt den Hauptinhalt zu überdecken. Kartenflächen im dunklen Design werden zum Anwendungshintergrund statt zu Weiß gemischt.

Geöffnete Variantenäste bleiben auf das Basisraster begrenzt. Cognis berücksichtigt zuerst die vom Anbieter bevorzugte Richtung, prüft danach alternative Richtungen gegen die gerenderte Rastergrenze und wählt die erste passende Option; beim Schließen werden die Anbieterpräferenzen wiederhergestellt. Der Hinweis zum Gedrückthalten ist für scharfe Schrift statisch und verwendet eine um 25 % größere Beschriftung.

Eine angezeigte Karte behält ihre zugewiesene Position, während ihre Nachfahren unabhängig eingepasst werden. Wenn durch die Pfadbereinigung weniger Richtungen als Geschwisterkarten verfügbar sind, werden weitere Kindkarten in derselben Zeile oder Spalte nach außen gestapelt, statt sich zu überlappen oder ihre Elternkarte zu verschieben.

Während ein untergeordneter Kartenzweig geöffnet ist, behalten nicht zugehörige Elternkarten ihre normale Oberfläche, statt auf Hover zu reagieren; auch ihre Bereichs- und Sichtbarkeitssymbole werden Teil des unscharfen Hintergrunds. Das aktive Elternelement und sein sichtbarer Nachfahrenpfad bleiben scharf und interaktiv.

Detail-Popups für lexikalische Einheiten zeigen die Vokabelbezeichnung ausschließlich im Popup-Titel. Die Titeldetailzeile enthält nur die für die aktive Cognis-Sprache lokalisierte Definition, sodass neben der Überschrift keine Schreibweise oder Aussprache doppelt erscheint.

Wenn ein Link zu einem verwandten Eintrag eine lexikalische Einheit ohne eigene Definition öffnet, übernimmt das Popup die lokalisierte Definition der Ausgangskarte. Eine vom Vokabeleintrag bereitgestellte Definition hat immer Vorrang, sodass mehrere mit derselben Schrifteinheit verknüpfte Vokabeleinträge unterschiedliche spezielle Bedeutungen behalten können. Zurück-/Weiter-Steuerungen und Links in der Titelzusammensetzung übertragen diesen Rückfallkontext nicht.

Karten können mehrere Definitionsdatensätze in der vom Anbieter festgelegten Reihenfolge referenzieren. Die erste lokalisierte Definition wird im Titeldetail hervorgehoben, sofern sie nicht mit dem Kartentitel identisch ist; weitere Definitionen erscheinen in einem Abschnitt „Zusätzliche Definitionen“, der bei leerem Inhalt entfällt. Der von einer Ausgangskarte geerbte Kontext bleibt nur dann ein Rückfallwert, wenn die Zielvokabel keine Definition bereitstellt.

Die Laufzeiteinpassung reserviert die Stammkarte und jede bereits platzierte Kindkarte des sichtbaren Zweigs. Ein Kind behält die vom Anbieter bevorzugte Richtung, wenn der begrenzte Platz frei ist; andernfalls wählt Cognis den begrenzten Kandidaten mit der geringsten Kartenüberlappung. Dadurch fallen Geschwisterkarten nicht mehr auf denselben Platz, während bei erschöpften Nachbarpositionen weiterhin nach außen in derselben Zeile oder Spalte gestapelt wird.

## Nachverfolgung neuer Inhalte

Die Bibliothek speichert die UUIDs angesehener Einträge pro Konto. Anbieteraktualisierungen behalten diesen Status bei und benachrichtigen aktivierte Konten nur über neu eingeführte stabile Eintrags-IDs, nicht über den gesamten aktualisierten Paketinhalt. Globale Einträge aus Anbieterpaketen oder genehmigten Beiträgen von Benutzern und Administratoren lösen für aktivierte Konten eine Bibliotheksbenachrichtigung aus. Einträge außerhalb des angesehenen Caches zeigen in der Vorschau **Neu**. Überfahren oder Öffnen der Details beziehungsweise des Editors, auch über Direktlinks und Beziehungen, speichert den Status für dieses Konto. Erfolgreiches Speichern entfernt passende Vorschaumarkierungen sofort und erhält den Status beim Neuladen.

## Beiträge, Sichtbarkeitsanfragen und Suche

Benutzer können Karten im persönlichen Namensraum erstellen, Lehrkräfte zusätzlich in eigenen Klassen und Administratoren außerdem global. Sprachmodule gestalten ebenenspezifische Formularfelder über `study:library:registerConstructor`; Sichtbarkeit, Klassenauswahl und die Definitionsvorschau bleiben Eigentum des Adapters. Vor einer persönlichen oder klassenbezogenen Erstellung weist die Bibliothek auf einen identischen sichtbaren globalen Eintrag hin und verlangt eine ausdrückliche Bestätigung. Die Erstellung verwendet standardmäßig den persönlichen Bereich; berechtigte Administratoren können die globale Veröffentlichung auswählen, während Lehrkräfte nur beschreibbare Klassen auswählen können, deren Sprache dem aktiven Schema entspricht.

Persönliche Karten können in einer belegten Klasse zur Prüfung durch deren Lehrkraft oder global zur Prüfung durch Administratoren veröffentlicht werden. Offene Anträge können vom Einreicher oder berechtigten Administratoren zurückgezogen werden. Die Genehmigung verschiebt die Originalkarte statt sie zu kopieren. Der Einreicher bleibt als Urheber erhalten und kann Änderungen globaler Inhalte beantragen; bearbeitende Administratoren werden Miteigentümer. Bereichswechsel und Löschungen unterliegen weiterhin den Zielberechtigungen. Anbieter-Manifeste können `protected: true` setzen; geschützte Einträge lassen sich weder verschieben noch löschen. Importierte und benutzererstellte Datensätze speichern normalisierten Suchtext; die Seitensuche durchsucht alle Ebenen und blendet leere Ergebnisse aus.

## Spracheigene Kartenkonstruktoren

Ein Sprachpaket kann in seinem Schema für jede erstellbare Ebene einen `cardConstructor` angeben. Die Spezifikation liefert die lokalisierte Beschriftung des Hauptfelds, geordnete Feld- und Beziehungs-IDs, Vorgabewerte des Anbieters sowie die Freigabe der Schalter für ausgeblendete Karten und Definitionsvorschauen. Cognis ergänzt darum rollenabhängige Sichtbarkeits- und Klassenfelder; Ebenen ohne Konstruktor sind für die Erstellung absichtlich schreibgeschützt.

Bei der Erstellung werden alle Beziehungssammlungen ohne Bildlaufleisten oder Richtungsschaltflächen angezeigt. Vorschauen beim Darüberfahren verwenden die Definition in der aktuellen Oberflächensprache. Ausgewählte oder vorgeschlagene Elemente werden zu verschiebbaren Kompositionsblöcken; ihre stabilen IDs erzeugen Beziehungsreferenzen, und die Aussprache wird rekursiv aus referenzierten Schreibeinheiten abgeleitet. Beim Erstellen von Definitionen werden Übersetzungen für alle unterstützten Oberflächensprachen angefordert.

Ein Sprachmodul kann alternativ die öffentliche ctx-Fähigkeit `study:library:provider` beziehen, `ingestContentPack(moduleRoot)` aufrufen und mit `registerConstructor(...)` einen Laufzeitkonstruktor anmelden. Cognis prüft dessen IDs gegen das registrierte Schema. Die zurückgegebene Entfernen-Funktion meldet ihn beim Deaktivieren des Moduls sauber ab.

Bei geordneten lexikalischen Sequenzen tragen nur Beziehungen mit `presentationRole: composition` (oder ohne Rolle bei älteren Kompositionsbeziehungen) zur Rekonstruktion der Beschriftung bei. Aussprache- und alternative Schreibweisen dürfen auf lexikalische Ebenen verweisen und Positionen wiederverwenden, ohne als Satzbestandteile behandelt zu werden.

Detailansichten blenden die Klasse `composite` aus. Andere Inhaltsklassen werden auf ihr lesbares letztes Segment reduziert und als Pills dargestellt (zum Beispiel wird `lexical:noun` zu **Noun**). Zusammengesetzte Überschriften zeigen alternative Lesungen und Aussprache unter der primären Lesung, während die Definition in der benachbarten Spalte bleibt. Die umgekehrte Vokabelnavigation unterdrückt lexikalische Einträge mit identischer Beschriftung, damit eine korrekte Wort-zu-Schriftzeichen-Beziehung nicht wie eine Rekursion wirkt. Eine verknüpfte Schreibweise im Titeldetail wird ebenfalls ausgelassen, wenn sowohl ihr normalisierter Text als auch ihr Ziel mit einem Link übereinstimmen, der bereits den Haupttitel zusammensetzt. Beziehungen ohne Resolver- oder Darstellungsrolle sind reine Abhängigkeitskanten: Sie bleiben für Rückwärtsnavigation und Löschregeln verfügbar, ohne als Titelkomposition interpretiert zu werden. Detailansichten vereinen Vokabelverwendung und andere eingehende Abhängigkeiten in einem Abschnitt **Verwendet von** und bevorzugen bei mehreren Datensätzen mit derselben normalisierten Beschriftung das Vokabelziel. Zusammengesetzte Popup-Überschriften verwenden einen kompakten Zeilenabstand zwischen Haupttitel und Lesedetail; Kartenvorschauen halten den verbleibenden Titel- und Definitionstext nach der Deduplizierung zentriert.

## Vertrag für externe Pakete

`study:library` ist die maßgebliche Grenze für ausführbare Anbieter und reine Datenpakete. Ein Paket besitzt genau den Namensraum, der in Manifest und Schema genannt wird. Beschriftungen von Schema, Ebenen, Feldern, Beziehungen, Konstruktoren und Optionen sind lokalisierte Zuordnungen. Anbietermetadaten dürfen JSON-kompatible Werte ergänzen; Cognis validiert jeden Wert, speichert das vollständige Schema und gibt es über `listSchemas()` und `GET /api/v1/study/library/schemas` unverändert zurück. Unbekannte Feldtypen sind nur mit einer deklarativen `validation`-Regel zulässig. Eingebaute Typen umfassen Zeichenketten, endliche Zahlen, sichere Ganzzahlen, boolesche Werte, Listen, lokalisierte Texte sowie einzelne oder mehrere Asset- und Audioverweise. Paketschutz, semantische Rollen, Raster, Detailhinweise, Aktivitätskompatibilität, Definitionslokalisierung, Interessensbereiche, Lizenzen und Assets gehören zum versionierten Vertrag. Das synthetische Fixture unter `tests/fixtures/` ist die Kompatibilitätsreferenz für Anbieter-CI.

Direkte ausführbare Schemaregistrierungen bleiben pro Schemaversion unveränderlich. Eine neuere Version eines maßgeblichen Inhaltspakets darf jedoch das gespeicherte Schemadokument bei derselben Kompatibilitätsversion überarbeiten, wenn alle installierten Besitzer dieser Schemaversion dieselbe Herausgeber- und Paket-ID haben. Cognis lehnt Kollisionen mit unabhängig registrierten oder anders besessenen Schemas ab, aktualisiert Schema und Einträge in einer Transaktion und erneuert das Schema im Arbeitsspeicher erst nach erfolgreichem Abschluss.

Inhaltsdatensätze können einen Namensraumwert `class` wie `lexical:noun` oder `lexical:verb` angeben. Die Bibliothek validiert und bewahrt diese anbieterneutrale Klassifizierung für zukünftige klassenspezifische Darstellung und Aktivitäten. Lokale Audioverweise in Listen werden einzeln zwischengespeichert, Asset-Listen in authentifizierte URLs umgeschrieben und Installationsbelege bewahren Manifest-Metadaten.

## Veröffentlichungsanfragen

Veröffentlichungsanfragen befinden sich auf der Study-Unterseite **Anfragen**. Aktivierte Administratoren erhalten Study-Benachrichtigungen über neue Anfragen und Entscheidungen anderer Administratoren.

## Administration und Erstellung

Die Verwaltungsbibliothek zeigt nur Ebenen der bereits ausgewählten Study-Sprache und verwendet ein nicht einklappbares Ebenenmenü. Editoren stellen Bezeichnung und Inhaltsklasse an den Anfang, unterscheiden Ansicht und Bearbeitung, schützen ungespeicherte Änderungen und zeigen Speichern nur beim Bearbeiten. Definitionsdatensätze sind immer verborgen, tragen die Klasse `definition` und zeigen keine Vorschau- oder Sichtbarkeitsschalter; geordnete Folgen tragen `composite`. Ein Inhaltsdatensatz kann `editable: false` setzen, Partikelebenen sind nie bearbeitbar. Die Erstellung ist nur als `+`-Seitenaktion auf benutzerseitigen Ebenenseiten verfügbar und führt durch Sichtbarkeit, Inhalt und Beziehungen. Einreichende können eigene Veröffentlichungsanfragen auf der Anfragenseite ansehen und zurückziehen.

Beim Erstellen bleiben aufgelöste Karten innerhalb des Eingabefelds, und die Aussprache wird in Echtzeit sowohl aus ausgewählten Datensätzen als auch aus noch nicht aufgelösten atomaren Zeichen abgeleitet. Doppelte Karussellbeschriftungen werden auf die beste lokalisierte Definitionsvorschau reduziert. Beziehungen werden als schreibgeschützte Eltern/Karte/Kinder-Übersicht dargestellt, während im Tab „Definitionen“ mehrere vollständige Übersetzungssätze in verschachtelten Dialogen erstellt und verknüpft werden können. Autoren in persönlichen und Klassenbereichen erhalten nicht das administrative Steuerelement „Ausgeblendet“; die globale Veröffentlichung heißt „Veröffentlichen“ und erklärt die Prüfungsanfrage in einem Informationstooltip.

Die direkte Erstellung schließt Definitionsebenen aus; Definitionen entstehen nur, wenn sie aus einem anderen Karten-Composer erstellt und verknüpft werden. Composer-Dialoge verwenden nach der Typauswahl den gemeinsamen Schutz vor ungespeicherten Änderungen. Detailaudio nutzt eine kompakte Lautsprechersteuerung: Eine Karte spielt ihr eigenes Audio oder bei Kompositionen die Audios aller geordneten Bestandteile nacheinander ab und bleibt deaktiviert, wenn einem Bestandteil Audio fehlt. Das Feld `strokePattern` speichert geordnete normalisierte Koordinaten, monotone Zeitangaben, optionalen Druck und eine Akzeptanztoleranz für deterministische Schreibübungen.

Die Kartenerstellung begrenzt jedes Beziehungskarussell auf zwei vertikal scrollende Zeilen und nutzt die gemeinsame verankerte Popup-Steuerung für stabile, ansichtsbereichsabhängige Vorschauen. Definitionsbeziehungen zeigen kein Karussell; ihr eigener Dialog für lokalisierte Sätze erstellt und verknüpft den Datensatz privat. Die Eingabeauflösung vergleicht den vollständigen normalisierten Wert auf exakte Treffer, und Beziehungsdiagramme zeigen nur ausdrücklich ausgewählte Kompositionsdatensätze. Veröffentlichungssteuerungen bleiben in einer Zeile, Erstellungsaktionen verwenden ein randlos zentriertes Plus, Zeichen-/Bearbeitungsaktionen zeigen Hover-Beschriftungen und Lautsprecher-Assets besitzen eigene helle und dunkle Varianten.

Beziehungskarussells behalten zwei Zeilen, scrollen nun aber horizontal. Strichmusterdaten sind reservierte Implementierungsdaten und erscheinen nie in Kartendetails. Zeichen- und Audioaktionen verwenden gekoppelte helle/dunkle Assets; beim Start der Schreibübung schließt sich der Detaildialog.

Study-Library-Seiten verwenden Dokumentlaufleisten, damit die Seite nicht mit einer inneren Inhaltslaufleiste konkurriert. Kartenvorschauen haben eine einheitliche Höhe. Hinzufügen-Aktionen für Beziehungen öffnen einen typgebundenen verschachtelten Editor, dessen Überschrift den Kartentyp nennt; verschachtelte Dialoge liegen über ihrem übergeordneten Dialog. Karussellvorschauen werden ausschließlich über ein inhaltsgroßes Portal im Dokumentkörper angezeigt und sofort entfernt, sobald das Element weder den Mauszeiger noch den Fokus besitzt.

Ein Feld kann `input.linkRelationships` angeben, um Lese- oder Aussprachewerte über mehrere vom Anbieter definierte Beziehungen navigierbar zu machen. Der Host führt passende Referenzen nach ihrer vorgegebenen Position zusammen und gleicht jedes sichtbare Segment mit der Bezeichnung oder den Aussprachealiasen der Zielkarte ab, wobei die ursprüngliche Karte das Linkziel bleibt.

Die schwebende Erstellen-Aktion verwendet je nach aktivem Design ein zwei Rem großes schwarzes oder weißes Pluszeichen. Überschriften der Editor-Karussells stammen aus den Metadaten der Zielschicht des Anbieters, und ihre Einträge bleiben auf diese Zielschicht beschränkt. Audio-Lautsprechersymbole wechseln anhand des Anwendungsdesigns zwischen ausdrücklichen hellen und dunklen Assets statt anhand der Farbvorgabe des Betriebssystems.

Bibliothekskarten akzeptieren durchsuchbare Tags wie Kompetenzstufen. Laufzeitanbieter können den vorhandenen Lookup-Provider-Vertrag über `study:library:provider` registrieren; Suchergebnisse können validierte Felder einschließlich eines `strokePattern` mit Herkunft und Konfidenz bereitstellen.

## Nachschlagedienste im Editor

Ein Laufzeit-Inhaltsanbieter registriert eine Nachschlageimplementierung über `study:library:provider.registerLookupProvider`. Er liefert eine stabile ID, lokalisierte Dienstbezeichnungen, eine Schema-/Ebenenprüfung und eine asynchrone Suche, die die unverarbeitete Editoreingabe erhält. Cognis zeigt jeden kompatiblen Anbieter unter der Eingabe als **Nachschlagen mit: Dienstname** an. Der ausgewählte Anbieter kann eine kanonische Bezeichnung, validierte Feldwerte, geordnete Beziehungsreferenzen, Herkunft und Konfidenz zurückgeben; der Editor wendet das Ergebnis mit der höchsten Konfidenz an, während die Endpunktzuständigkeit beim Study-Gateway-Client bleibt.

Beim Aktivieren eines Moduls werden erforderliche Serverfähigkeiten sowohl im injizierten Routenkontext als auch unter den öffentlichen Fähigkeiten des System-ctx geprüft. Ein Modul kann daher `study:library:provider` sicher in `requiresCapabilities` deklarieren; private ctx-Fähigkeiten bleiben nicht verfügbar.

Beim Erstellen und Bearbeiten bleiben ungeordnete Beziehungen erhalten, ohne Positionsmetadaten auszugeben. Die Beziehungsstruktur ist nur im Ansichtsmodus sichtbar; Bearbeitungs- und Erstellformulare behalten diese Referenzen über verborgene Steuerelemente. Formulare für zusammengesetzte Schreibeinheiten bieten ein freies Feld **Eingabe**, benennen ihr Karussell für atomare Referenzen nach dem Aussprachefeld des Anbieters und zeigen Nachschlageaktionen erst nach einer Eingabe in derselben Zeile. Strichmuster bleiben verborgene Anbieterdaten. Aktionen zum Hinzufügen von Definitionen verwenden ein größeres neutrales Steuerelement, und Karussellvorschauen passen ihre Fläche an den vollständigen Inhalt an.

Bestehende Karten mit zusammengesetzten Schreibeinheiten platzieren ihre Ausspracheauswahl im Feld Aussprache statt oberhalb der Inhaltsregister oder neben einer Schlagwort-Eingabe. Karussellüberschriften verwenden die lokalisierten Namen der Zielschichten des Inhaltsanbieters. Der Editor ordnet ausgewählte atomare Schreibeinheiten nach ihrem Vorkommen in der Kartenaussprache oder -beschriftung und leitet daraus die gespeicherte Aussprache ab. Bestehende Audiofelder zeigen den gespeicherten Dateinamen, neu hochgeladene Dateien behalten einen erkennbaren Dateinamen und Lautsprecher-Assets folgen dem aktiven Anwendungsdesign.

## Anbietergebundene Aussprachebearbeitung

Ein Anbieter kann `input.linkRelationships` für ein Aussprachefeld festlegen. Der Editor ersetzt dann die freie Tag-Eingabe durch geordnete Karussells genau für diese Beziehungen und verwendet die lokalisierte Anbieterbezeichnung jeder Zielebene. Beim Speichern einer vom Anbieter installierten Karte wird der Datensatz als benutzergeändert markiert, damit spätere Inhalts-Paket-Abgleiche die Felder und Beziehungen des Benutzers erhalten.

Die Aussprachebearbeitung ist ein wiederholbarer zweistufiger Vorgang: Zuerst werden anbieterkompatible Komponentenkarten ausgewählt, danach wird die abgeleitete Lesung übernommen. Karusselleinträge zeigen ihre Aussprache statt ihrer primären Bezeichnung. Zusammengesetzte Schrifteinheiten verwenden atomare Schrifteinheiten, geordnete lexikalische Folgen dagegen lexikalische Einheiten wie Wortschatz und Partikeln. Audio-Uploads verwenden einen stabilen Objekt-Schlüssel aus Karte und Feld, sodass ein erneuter Upload das vorherige Objekt überschreibt.

Während die Zeichenübung geöffnet ist, lädt die Auswahl einer anderen Karte mit Strichmuster diese Karte in das vorhandene Zeichenfeld, statt ihren Detaildialog zu öffnen.

Vokabel-, Satz- und Verbundkarten leiten ihre Zeichenanleitung rekursiv aus geordneten Schrifteinheiten-Beziehungen ab und dürfen keine eigenen Strichmuster deklarieren. Anbietergebundene alternative Zeichen verwenden nach Möglichkeit das Audio eines verknüpften Zeichens; ausdrücklich hochgeladenes Audio einer benutzereigenen Karte bleibt maßgeblich.

Erstellungsformulare verwenden den gemeinsamen Formular-Builder für Pflichtbezeichnungen und lokalisierte Definitionsfelder. Die Eingabe alternativer Zeichen ist Freitext, wird aber erst nach Bestätigung durch einen Wörterbuchanbieter gültig; Anbieterergebnisse behalten ausgeblendete Pflichtfelder wie Strichmuster bei. Ausspracheauswahlen liegen im Feld Aussprache, Wörter können ihre Aussprache aus Zeichenkarten zusammensetzen und Partikel sind keine auswählbare Inhaltsklasse mehr. Die Auflösung zusammengesetzter Zeichnungen folgt vor Ausspracheverknüpfungen der primären Schreibweise.

Beim Bearbeiten werden vorhandene Datensätze gegen das aktuelle Anbieterschema geprüft und auf dessen gespeicherte Schemaversion migriert, sodass Audioabruf und Aktualisierungen nach einem Anbieter-Upgrade gültig bleiben. Detailabfragen behalten die Bearbeitungsberechtigungen nach dem Schließen des Editors. Zeichnen wird auf Schreibeinheiten und Vokabeln begrenzt; die Strichauflösung für Vokabeln verwendet die primäre Schreibweise statt Ausspracheverknüpfungen.

Die Erstellung schließt Partikelebenen aus. Bei Sätzen und Komposita werden unter der Eingabe alle Beziehungskarussells des Anbieters wiederhergestellt, einschließlich Vokabeln, Partikeln, alternativen Zeichen und Zeichen; die Aussprache wird ohne separaten Ausspracheeditor abgeleitet. Konstruktoren für Vokabeln und alternative Zeichen enthalten eine zeichenbasierte Ausspracheauswahl, zeigen dort die primären Zeichenwerte und stellen die gewählte Schreibweise vor dem Übernehmen der abgeleiteten Aussprache bereit.
Die Aussprachekomposition entspricht der Eingabekomposition: Geben Sie freien Text in die vorbereitete Eingabe ein oder wählen Sie atomare Zeichenkarten im Zeichenkarussell aus und bestätigen Sie anschließend die kombinierte Aussprache. Aussprachewähler für Vokabeln und alternative Zeichen ersetzen atomare Zeichen niemals durch Vokabelkarten.

Jede `cardConstructor`-Nutzlast stellt `input_carousels` und `pronunciation_carousels` bereit. Beide Arrays enthalten Zielschicht-IDs dieses Konstruktors: Eingabekarussells bilden den Primärwert, während Aussprachekarussells jede deklarierte Lesungsbeziehung zu dieser Schicht erfüllen. Bei alternativen Zeichen sind nur die Mindestwerte der Aussprachekarussells erforderlich; nicht aufgelöste Primärbeziehungen verhindern die Erstellung nicht. Lookup-Anbieter können anbietereigene Herkunfts- und Rangmetadaten auslassen, da die Bibliothek diese Werte aus dem registrierten Anbieter normalisiert.

Karussell-Arrays des Kartenkonstruktors sind verpflichtend; fehlende Arrays werden abgelehnt statt abgeleitet. Laufzeit-Formularbeiträge gelten sowohl bei der serverseitigen Beziehungsprüfung als auch bei der Schemadarstellung. Bearbeitungsformulare verwenden dasselbe deklarierte Aussprachekarussell wie Erstellungsformulare. Audio-Uploads verwenden die normalisierte Kartenbezeichnung und Feld-ID als Speicherdateinamen, sodass ein Ersatz-Upload dasselbe Objekt überschreibt.

Kartenkonstruktoren sind der einzige Formularvertrag für Erstellung und Bearbeitung. Ihre Liste `fields` bestimmt die sichtbaren skalaren Felder, während `relationships`, `input_carousels` und `pronunciation_carousels` die verfügbaren Beziehungskarussells festlegen. Konstruktoren für alternative Zeichen können die Eingabe uneingeschränkt lassen und Zeichenbeziehungen unter Aussprache platzieren. Wortschatz-Konstruktoren können Zeichen-, alternative Zeichen- und Wortschatzbeziehungen unter Eingabe platzieren; Satz- und Verbundkonstruktoren können dort Partikel-, alternative Zeichen- und Wortschatzbeziehungen platzieren. Die Aussprache von Wortschatz, Sätzen und Verbünden wird rekursiv aus ihren geordneten Bestandteilen abgeleitet, daher lassen ihre Konstruktoren das Aussprachefeld weg.

Wenn ein Aussprachefeld in einem Erstellungs- oder Bearbeitungsformular sichtbar ist, zeigt Library den Aussprache-Composer statt eines generischen Listen-Textfelds an. Die `pronunciation_carousels` des Konstruktors bestimmen weiterhin, welche schichtspezifischen Beziehungskarussells darin erscheinen.

Die aktuelle Konstruktorregel ersetzt frühere Aussprache-Selektoren für Wortschatz: Wortschatz verwendet Zeichen-, Alternativzeichen- und Wortschatzkarussells ausschließlich in der Eingabe. Sätze und Verbünde verwenden Partikel-, Alternativzeichen- und Wortschatzkarussells in der Eingabe. Nur Alternativzeichen verwenden ein Zeichenkarussell in der Aussprache; ihre Eingabe bleibt frei. Wortschatz-, Satz- und Verbundaussprache wird beim Speichern rekursiv aus dem vollständigen geordneten Beziehungsgraphen neu berechnet.

Formulare für Wortschatz, Sätze und Verbünde zeigen den generischen Listenwert-Editor für Aussprache niemals an, selbst wenn ein Anbieter-Payload dieses abgeleitete Feld enthält. Andere listenwertige Anbieterfelder verwenden statt entfernbarer Tag-Chips ein einfaches, zeilengetrenntes Textfeld; Klassifizierungs-Tags von Einträgen behalten ihre eigene Metadatensteuerung.

Wortschatz- und Satzkarten spielen die Audiodateien ihrer geordneten Abhängigkeiten als eine Sequenz ab, wenn kein eigenes Audio hochgeladen wurde. Ein optionaler Audio-Upload auf der Karte überschreibt diese abgeleitete Sequenz. Fehlt bei einer Abhängigkeit Audio, erklärt der deaktivierte Lautsprecher den fehlenden Inhalt beim Darüberfahren.

Aussprachekarussells laden nun jede Beziehung, die durch die Karussellschicht-Deklarationen des Konstruktors vorgegeben ist, auch wenn ein Laufzeit-Formularbeitrag diese Beziehung in seiner skalaren Beziehungsliste auslässt. Die Auswahl von Karussellelementen aktualisiert den Aussprachewert sofort; das redundante Freitextfeld und die Bestätigungsschaltfläche wurden aus Erstellungs- und Bearbeitungsformularen entfernt.

Zusammengesetzte Schreibeinheiten bilden Aussprachen aus atomaren Schreibeinheiten. Lexikalische Einheiten verwenden atomare Schreibeinheiten für Aussprachen und Schreib- oder lexikalische Einheiten für Eingaben. Geordnete lexikalische Folgen leiten Aussprachen aus ausgewählten lexikalischen Einheiten und Partikeln ab. Diese semantischen Rollen definieren den aktuellen Composer-Vertrag.

Das integrierte semantische Composer-Profil wendet den gewünschten Karussellvertrag nun direkt an: alternative Zeichen verwenden eine freie Eingabe und ein Aussprachekarussell für atomare Zeichen; Wortschatz verwendet Eingabekarussells für atomare Zeichen, alternative Zeichen und Wortschatz sowie ein Aussprachekarussell für atomare Zeichen; Sätze verwenden Eingabekarussells für Partikel, alternative Zeichen und Wortschatz und bieten keine bearbeitbare Aussprache. Die Wortschatzaussprache wird rekursiv aus Werten der Zeichenebene vorbelegt, während die Satzaussprache vollständig abgeleitet bleibt.

Schichten für atomare Zeichen und Partikel sind unveränderliche Katalogdaten. Die Library-API lehnt nun Erstellen, Aktualisieren, Aktualisierungsanfragen und Löschen für diese Schichten bei jeder Rolle ab, einschließlich Administratoren und Eigentümern. UI-Berechtigungsantworten blenden Bearbeitungs- und Löschsteuerungen aus, während die schreibgeschützte Ansicht erhalten bleibt.

Geordnete Auswahlen verwenden nun über alle Eingabe-Karussells hinweg eine gemeinsame Positionsfolge. Positionsmarken beschreiben damit die gespeicherte Kartenreihenfolge, statt bei jedem Beziehungskarussell wieder bei eins zu beginnen.

Autorenformulare zeigen die interne Inhaltsklassenauswahl von Cognis nicht mehr an. In Detailansichten kennzeichnet der lokalisierte Schichtname des Anbieters die Karte, und Datensätze geordneter Folgen verwenden die Schicht-ID des Anbieters statt semantischer Bezeichnungen wie `sentence` oder `composite`. Abgeleitete Aussprachen werden gemäß dem deklarierten Feldvertrag des Anbieters serialisiert, einschließlich listenwertiger Aussprachefelder.

Die Serialisierung abgeleiteter Felder löst ihren Vertrag aus dem Anbieterschema statt aus der vom Konstruktor gefilterten Editorschicht auf. Erforderliche Aussprachefelder bleiben dadurch auffindbar, auch wenn der Composer ihr direktes Eingabefeld absichtlich ausblendet.

Wenn ein Konstruktor Eingabe- oder Aussprache-Karussellschichten deklariert, enthält die entsprechende Überschrift über den Karussells ein dauerhaftes Feld für ausgewählte Karten. Das Feld wird für bestehende Einträge initialisiert, bei der Karussellauswahl sofort aktualisiert, bewahrt die Kompositionsreihenfolge und ermöglicht das direkte Entfernen einer ausgewählten Karte.

Karussellgestützte Felder akzeptieren den anbietereigenen booleschen Wert `multi_value` auf Feldebene. Mehrwertige Felder erhalten eine ausdrückliche Aktion **{Feld} speichern**, zeigen bestätigte Werte als entfernbare Pillen über der aktiven Komposition und ermöglichen das erneute Öffnen eines bestätigten Werts zum Ersetzen. Jedes Karussell-Kompositionsfeld akzeptiert nur Text, der zu Karten aus seinen konfigurierten Karussells aufgelöst wurde; nicht aufgelöster Text macht das Formular ungültig. Das Entfernen einer ausgewählten Karte oder eines bestätigten Werts erfordert das eigene ×-Steuerelement und eine Bestätigung. Editoren bestehender Karten binden dieselben Beziehungskarussells wie Erstellungsformulare ein.

Der boolesche Wert `multi_value` auf Feldebene ist die einzige Mehrwertdeklaration. Bestätigte Pillen füllen die Zwischenkomposition beim Anklicken nicht mehr. Die mehrwertige Zwischenablage beginnt leer, ihre kompakten ×-Steuerelemente entfernen ohne Bestätigung nur vorgemerkte Karten, und Referenzen werden erst durch die sichtbare feldspezifische Speicheraktion bestätigt. Gespeicherte Werte bleiben beim Entfernen ihrer vorgemerkten Karten unverändert. Kartenbezeichnungen werden aus der geordneten primären Input-Komposition erzeugt, statt als eigener editierbarer Wert angezeigt zu werden; nach erfolgreichem Speichern wird die sichtbare Kartenvorschau sofort aktualisiert.

Karussellkarten zeigen wieder für jeden Eintrag eine Vorschau bei Mauszeigerkontakt und Tastaturfokus, auch wenn keine Definition vorhanden ist. Karussellvorschauen und Hinweise auf fehlendes Audio werden in verankerten Portalen auf Body-Ebene gerendert, sodass Überlaufregeln von Karten, Karussells und Pop-ups sie nicht abschneiden.

Gruppierte Beziehungen bewahren verschachtelte Referenzfelder für mehrwertige Felder. Jede Aussprache kann dadurch eine eigene geordnete Zeichenfolge besitzen, die bei Inhaltsprüfung, Validierung, Speicherung, API-Bearbeitung und verlinkter Titeldarstellung gruppiert bleibt, statt zu einer mehrdeutigen Liste abgeflacht zu werden.

Ausgeblendete Karten werden aus allen Karussells und Vorschlagslisten für Texteingaben ausgeschlossen. Bereits vorhandene ausgeblendete Abhängigkeiten bleiben beim Bearbeiten einer Karte in den zugrunde liegenden Beziehungssteuerelementen erhalten, werden aber nie als auswählbare Karusselloptionen angeboten.

Aus dem Speicher geladene gruppierte Beziehungen werden vor der Sortierung ihrer Einträge nach Position komprimiert. Ein fehlender Gruppenindex kann daher den Endpunkt für Bibliothekseinträge nicht mehr fehlschlagen lassen, während die Reihenfolge jeder gespeicherten Aussprachegruppe deterministisch bleibt.

Kartenvorschauen der Bibliothek zeigen höchstens die ersten beiden unterschiedlichen Aussprachen. Die Detailansicht des Eintrags stellt weiterhin alle Aussprachen bereit, ohne die Kartenübersicht unnötig hoch oder dicht zu machen.

Die Ausspracheanzeige setzt jede verschachtelte Zeichenfolge zu ihrer vollständigen Lesung zusammen, bevor sie mit der Kartenbeschriftung verglichen wird. Eine gruppierte Aussprache wie `["さ", "き"]` wird daher als `さき` dargestellt und weggelassen, wenn die Karte bereits denselben Wert verwendet.

Verknüpfte Aussprachetitel werden außerdem anhand der tatsächlichen UI-Darstellung dedupliziert: Die verknüpften Zeichenbeschriftungen werden verbunden, Leerraum und Unicode-Formen normalisiert und die resultierende Lesung mit dem Kartenwert verglichen. Dadurch wiederholt eine verknüpfte Folge `さ` + `き` keinen Titel `さき`, selbst wenn ihre gespeicherte Aussprachedarstellung abweicht.

Eine einzelne Gruppe eines mehrwertigen Feldes kann mehrere deklarierte Verknüpfungsbeziehungen umfassen. Die Gruppenindizes sind über diese Beziehungen hinweg ausgerichtet; daher vergleicht die Validierung die Anzahl der Feldwerte mit der größten Gruppenzahl einer verknüpften Beziehung, statt die Zahlen zu addieren. So können Aussprachen gemeinsam aus bedeutungstragenden Lesesegmenten und direkten Zeichensuffixen zusammengesetzt werden.

Wenn eine verknüpfte Aussprache den primären Kartenwert exakt schreibt, steigt die Titeldarstellung eine Ebene tiefer und zeigt die eigenen Aussprachewerte der verknüpften Karten. Eine Kana-Schreibweise wie `さ` + `き` kann dadurch ihre Lesungen aus der Zeichenebene darstellen, statt `さき` redundant zu wiederholen.

Die Deduplizierung von Titelreferenzen behandelt eine geordnete Schreibweise nun als Einheit, statt einzelne übereinstimmende Zeichen zu entfernen. Wenn die vollständige Schreibweise dem primären Wert entspricht, zeigen die verknüpften Zeichenkarten ihre Aussprachewerte; Teilfragmente können keinen Titel mehr erzeugen, dessen sichtbare Aussprache vom primären Wert abweicht. Kanji-Detailansichten zeigen weiterhin die vollständige, vom Anbieter erfasste Leseliste statt aus benachbarten Karten abgeleiteter Lesungen.

Zum Entfernen einer vorgemerkten Composer-Karte muss exakt auf ihre kompakte ×-Schaltfläche geklickt werden; weder die umgebende Auswahlmarke noch der leere Kompositionsbereich lösen das Löschen aus. Bevor ein Erstellungsdialog geschlossen wird, prüft der Composer außerdem jedes vom Anbieter geforderte Beziehungsminimum. Fehlende Definitionen zeigen nun die übliche Validierungsmeldung an und lassen Dialog, ausgewählte Karten, Texteingaben und verschachtelte Definitionen zur Korrektur unverändert geöffnet.

Lange Aussprache- und Definitionsangaben in Eintragsüberschriften behalten ihre ursprüngliche Startposition bei, nutzen jedoch höchstens 40 % der Überschriftenbreite und werden in weitere Zeilen umgebrochen. Ein Gedankenstrich trennt Definitionen nun deutlicher von Aussprachen. Erstellungsdialoge erlauben höchstens 8 Tags, 10 Definitionen und 16 Aussprachen und zeigen beim Erreichen einer Grenze eine lokalisierte Meldung an.

Dichte Überschriften mit Aussprachen verwenden nun nur bei vorhandenen Lesungen eine vierspaltige Anordnung: Der Lautsprecher befindet sich unter dem Bereichssymbol, der Ausspracheblock belegt bis zu 40 % der Überschrift und Definitionen werden rechts davon unabhängig umgebrochen. Die Grenzen von 8 Tags, 10 Definitionen und 16 Aussprachen gelten nun gleichermaßen für Erstellungs- und Bearbeitungsdialoge.

Wenn ein aufgeklappter Zweig mit untergeordneten Zeichen das sichtbare Bibliotheksraster überschreiten würde, prüft die Laufzeitanpassung nun alle diagonalen Plätze, bevor sie auf die entgegengesetzten Hauptrichtungen zurückfällt. Dabei gelten alle sichtbaren Stammkarten als belegt, sodass die erste innerhalb der Grenzen liegende, kollisionsfreie Diagonale gewählt wird und sowohl die untergeordnete Karte als auch ihre Verbindung auf der Zeichenfläche bleiben.

## Satzaufbau und Transformationen

Jeder Eintrag in `tag_carousels` muss `excludeFromBrowse` deklarieren: `false` erhält sichtbaren Wortschatz in der normalen Ansicht; `true` reserviert ihn für den Composer. Diese ausdrückliche Anbieterentscheidung ist unabhängig von ausgeblendeten Aussprachehilfen. Das bisherige Auswahlverhalten der Metadatenfilter bleibt erhalten.

`literal_carousels` stellt eine einzeilige, schreibgeschützte Auswahl wiederholt nutzbarer Satzzeichen bereit; Anbieter führen die Satzzeichen ihrer Sprache auf, etwa `, . ? !` für Englisch oder `？！。、` für Japanisch.

Anbieter markieren Grundformen von Verben und Adverbien mit `verb` oder `adverb` und deklarieren eine Ebenenansicht `views` mit `layout: transformTree`. Benannte Ansichten filtern Einträge nur bei ausdrücklicher Auswahl; ihre Tags entfernen keine lexikalischen Wörter aus der normalen Ansicht. Inhaltspakete liefern ausschließlich die lexikalische Grundform (beispielsweise `歩く`) und niemals je eine Karte pro Flexionsform. Eine schemaweite `transformSets`-Deklaration beschreibt deterministische Zustandsübergänge. Jede Regel nennt Ausgangs- und Zielzustand und ersetzt genau ein Suffix über `removeSuffix` und `append`; mehrere Regeln dürfen denselben Zustand verlassen und weitere Regeln auf erzeugten Zuständen aufbauen. `matchTags` wählt die passende Grundformklasse aus, sodass Anbieter Konjugationsfamilien etwa mit `godan-ku` unterscheiden können.

```json
{
    "transformSets": [
        {
            "id": "godan-ku",
            "matchTags": ["verb", "godan-ku"],
            "baseState": "base",
            "rules": [
                {
                    "id": "potential",
                    "fromState": "base",
                    "toState": "potential",
                    "removeSuffix": "く",
                    "append": "ける"
                },
                {
                    "id": "negative",
                    "fromState": "base",
                    "toState": "negative",
                    "removeSuffix": "く",
                    "append": "かない"
                },
                {
                    "id": "desiderative",
                    "fromState": "base",
                    "toState": "desiderative",
                    "removeSuffix": "く",
                    "append": "きたい"
                }
            ]
        }
    ]
}
```

Tags für Satzübergänge wählen ein eigenes Composer-Karussell und werden aus dem normalen Eingabekarussell ausgeschlossen. Die Sichtbarkeit in der normalen Ansicht folgt der ausdrücklichen Anbietereinstellung `excludeFromBrowse`. Bearbeitungsdialoge rekonstruieren wiederholbare Satzzeichen aus der gespeicherten Satzbeschriftung und den geordneten Referenzen. Transformationsbäume bieten nun ausführbare Knoten: Die Auswahl einer erzeugten Form aktualisiert die Pfadvorschau, während die Grundformkarte der kanonische gespeicherte Eintrag bleibt. Die Vertragsvalidierung weist doppelte Satzzeichen, leere Transformationssätze, doppelte Zustandsübergänge und wirkungslose Regeln zurück.

Unterkarten-Zweige behalten nun jede bereits eingepasste Kartenposition bei, während tiefere Nachfahren geöffnet werden. Neu eingeblendete Nachfahren werden nach Tiefe vermessen und nur in sichtbare, kollisionsfreie Flächenplätze umgeleitet. Dadurch werden Sprünge von Vorfahren, Kartenüberlappungen und gedrängte Verbindungen bei der natürlichen Baumnavigation verhindert.

Diagonale Unterkartenpfade bieten nun einen größeren, durchgängigen Zeigerkorridor, Zweigwechsel warten kurz auf eine eindeutige Zeigerabsicht, und aktive Karten verwenden statt einer pulsierenden Animation einen ruhigen Fokusring. Ausweichrichtungen bleiben zunächst nahe an der bevorzugten Achse, bevor entfernte Plätze berücksichtigt werden, wodurch dichtere und gleichmäßigere Anfangsanordnungen entstehen.

Eingabe- und Aussprachekomposition verwenden nun denselben wiederverwendbaren Token-Eingabe-Renderer und dieselbe Beziehungskarussell-Implementierung. Eingabekarussells erscheinen unmittelbar unter ihrem Token-Feld, verwenden dieselbe kompakte Entfernen-Schaltfläche und denselben Auswahlzustand und bieten die Erstellung von Abhängigkeiten nur an, wenn die Zielebene benutzerdefinierte Karten unterstützt. Neu erstellte Abhängigkeiten werden in Erstellungs- und Bearbeitungsdialogen über den kanonischen wiederverwendbaren Karussell-Renderer eingefügt.

Neue Abhängigkeiten, die über ein Beziehungskarussell erstellt werden, durchlaufen den normalen Auswahlpfad dieses Karussells. Dadurch wird die zurückgegebene Karte sofort ausgewählt und der aktiven Kompositionsfläche hinzugefügt. Aussprache-Composer für alternative Zeichen behandeln außerdem jede Beziehung zu atomaren Zeichen als Aussprachequelle, selbst wenn ein Anbieter eine allgemeinere Darstellungsrolle für die Beziehung verwendet.

Karten-Composer mit Strichunterstützung zeigen einen eigenen Abschnitt **Strichmuster**. Nachschlageanbieter deklarieren die Feld-IDs, die sie befüllen; Anbieter, die das Strichfeld angeben, erscheinen dort als knappe Aktion **Nachschlagen**, und geladene normalisierte Strichdaten werden in einer kompakten Vorschau mit vier Rem Kantenlänge gezeichnet. Die Validierung von Editoren mit mehreren Reitern kennzeichnet jeden Reiter mit ungültigen Pflichtdaten, öffnet den Reiter mit dem ersten ungültigen Feld und verschiebt den Fokus dorthin oder bei einer fehlenden Pflichtdefinition zur Aktion zum Erstellen einer Definition.

Definitionen in Popup-Titeln werden nun ohne vorangestellten Gedankenstrich dargestellt. Aussprache- und Definitionsgruppen belegen die Titelzeile und sind vertikal am primären Kartentitel ausgerichtet.

Schichtschemas können `dictionary_lookup: false` setzen, um Nachschlageanbieter mit deklarierter `dictionary`-Fähigkeit auszublenden. Nachschlageanbieter deklarieren ihre neutralen Fähigkeiten und befüllten Feld-IDs, damit Aktionen zur Strichsuche ausschließlich im Abschnitt Strichmuster erscheinen. Composer für alternative Zeichen behandeln Beziehungen außerhalb von Definitionen als Aussprachequellen und verlangen keine Definitionen. Schlagwörter erscheinen in jedem Inhaltsformular zuletzt. Pflichtreiter behalten ihren normalen Stil und zeigen nur ein rotes Sternchen; eine fehlende Pflichtdefinition kennzeichnet zusätzlich die Aktion zum Hinzufügen.

Der Library-Editor delegiert Tab-Aktivierung, Markierungen ungültiger Tabs und den Fokus auf das erste ungültige Feld an den Controller `bindTabbedFormValidation` des wiederverwendbaren Formular-Composers. Der Library-Code liefert nur das domänenspezifische Fokusziel für Definitionen und die Klasse der Pflichtmarkierung.

Formularnutzlasten für alternative Zeichen kopieren `pronunciation_carousels` direkt aus der Wortschatz-Formularnutzlast desselben Schemas. Der Composer verwendet diese angeglichene Nutzlast ohne spezielle Karussellableitung oder Beziehungsfilterung für alternative Zeichen. Die Zuordnung der Strichmuster-Suche platziert die Aktion **Nachschlagen** des Anbieters weiterhin im Abschnitt Strichmuster. Bibliotheksschichtrouten akzeptieren das optionale Ansichtssegment für anbieterseitig deklarierte Verben- und Adverbienansichten.

Die Angleichung der Formularnutzlast für alternative Zeichen aktualisiert jetzt sowohl `pronunciation_carousels` als auch die Beziehungs-IDs, die diese Karussells darstellen. Beziehungen des ersetzten Wortschatz-Aussprachekarussells werden entfernt und die Zeichenbeziehungen des Aussprachekarussells der Wortschatzkarte eingefügt. Das Formular für alternative Zeichen zeigt daher das Zeichenkarussell und nicht mehr Wortschatz unter Aussprache.

Die Ausspracheableitung endet jetzt bei der ersten expliziten Aussprache und verwendet nur bei atomaren Zeichenkarten ersatzweise die Beschriftung. Neue Wörter und Sätze werden dadurch nicht mehr zu Zeichenlesungen abgeflacht. Die Erstellung lehnt sichtbare Duplikate allein anhand der normalisierten Eingabe ab; die Bestätigung erklärt, dass beim Fortfahren die vorhandene Karte ausgewählt wird, statt eine weitere Zeile anzulegen. Speicherung und Prüfung von Push-Anfragen erkennen die Typen `update` und `merge`.

Definitionen in Pop-ups belegen jetzt die zweite Rasterzeile direkt unter dem Kartentitel statt einer eigenen rechten Spalte. Lesungen bleiben in der Titelzeile zentriert, während lange Definitionen unter dem Titel natürlich umbrechen.

Die Ausspracheauflösung für Partikeln endet wie bei atomaren Zeichen: Zuerst wird eine explizite Partikelaussprache verwendet, andernfalls die Partikelbeschriftung. Der Resolver steigt nicht mehr in die Zeichenreferenzen einer Partikel ab, sodass kontextabhängige Partikeln wie は und が wie verfasst ausgesprochen bleiben.

Beim Speichern einer leeren Aussprache-Stufe erscheint jetzt eine Fehlermeldung. Gespeicherte Aussprachekarten behalten ihre Entfernen-Schaltfläche innerhalb der Karte; die Auswahl einer gespeicherten Karte verschiebt ihre gruppierten Komponentenreferenzen zurück in die Stufe und wählt die zugehörigen Karussellkarten zur Bearbeitung erneut aus.

Die Option „Definition(en) immer in der Kartenvorschau anzeigen“ befindet sich jetzt im Tab Definitionen neben den Definitionsübersichten. Editoren vorhandener Karten bieten außerdem die Aktion zum Hinzufügen einer Definition; eine neu erstellte Definition wird sofort ausgewählt und der sichtbaren Übersicht hinzugefügt.

Die Elternzuordnung in Karten-Popup-Überschriften verwendet nun dieselbe Platzierung wie die Lesung und wird vor der Definition eingefügt. Karten, die eine Definition vom Elterneintrag übernehmen, behalten dadurch die Zuordnung geschlossen in der Titelzeile, während die Definition unverändert unter dem Titel bleibt.

Tags von Content-Pack-Einträgen werden nun validiert, in die Inhaltsidentität aufgenommen und in der Tag-Spalte sowie im Suchtext des Bibliothekseintrags gespeichert. Vom Anbieter markiertes Vokabular bleibt dadurch nach dem Import für deklarierte Ansichten wie Verben und Adverbien verfügbar.

Transformationssätze unterstützen beliebig verkettete und verzweigte Regeln, einschließlich optionaler Suffixoperationen für die Aussprache und lokalisierter Definitionsüberschreibungen. Verb- und Adverbansichten stellen diese Pfade als verbundene Technologiebäume dar. Die Auswahl einer transformierbaren Karte im Karussell öffnet denselben Baum und fügt die gewählte Form in einen zusammengesetzten Satz ein, während der Verweis auf die kanonische Grundkarte erhalten bleibt. Beim erneuten Öffnen eines transformierten Verweises wird die verfasste Form erkannt, die Grundkarte unter dieser Form geöffnet und der vollständige Pfad mit transformationsspezifischer Aussprache und Definition angezeigt.

Die Einpassung von Kindkarten behandelt jede Vorfahrenkarte als zwingende Ausschlusszone. Diagonale und kardinale Richtungen werden in zunehmend größeren Abständen geprüft, sodass ein blockiertes Kind bei Bedarf zwei oder mehr Positionen nach außen rückt, anstatt eine Karte seiner Elternkette zu kreuzen oder hinter ihr zu verschwinden.

Transformationsbaum-Ansichten beginnen jetzt als dichtes Kartenraster über die gesamte Breite. Karten ohne verfügbare Transformationen bleiben inaktiv. Beim Öffnen wird eine erweiterbare Karte nach oben verschoben, die übrigen Karten werden animiert ausgeblendet und der Baum wächst direkt unter der zentrierten Wurzel über die gesamte Inhaltsbreite; die Schließen-Schaltfläche stellt das Raster wieder her. Die Auswahl einer Transformation hebt den vollständigen Pfad zurück zur Wurzel hervor und animiert ihn fortlaufend, während Transformationsbezeichnungen über den Werten stehen, um Überläufe in schmalen Karten zu vermeiden.

Transformationsbäume behalten jetzt die Karte des Ausgangsverbs oder -adverbs als unveränderte visuelle Wurzel bei und lassen die redundante Zusammenfassung der ausgewählten Form darunter weg. Verbindungslinien schließen lückenlos aneinander an und werden im gesamten Baum kontinuierlich animiert, während der ausgewählte Herkunftspfad deutlich hervorgehoben bleibt. Ein Klick auf die bereits geöffnete Ausgangskarte öffnet nun ihre Standarddetailansicht.

Verb- und Adverbeinträge bleiben auf der Wortschatzseite, auf der vom Anbieter deklarierte Transformations-Tags als Filter erscheinen. Jede Regel kann eine lokalisierte `definitionTransform` mit optionalen Grenzen `matchPrefix` und `matchSuffix` sowie einer erforderlichen `template` deklarieren. Vorlagen werden entlang des ausgewählten Pfads verkettet und unterstützen `{{ definition }}`, `{{ stem }}`, `{{ prefix }}` und `{{ suffix }}`. Anbieter können dadurch grammatische Änderungen statt eines festen Markers ausdrücken. Die Detailansicht zeichnet nach der Variantenauswahl Titel, Aussprache, Definitionen und Zeicheneingabe transformiert neu und deaktiviert die Bearbeitung.

Transformationsgraphen platzieren jede Tiefe in einer horizontalen Reihe, zeigen Definitionen unter den Karten, stellen vierzehn rem breite Definitionsspalten bereit und begrenzen horizontalen sowie vertikalen Überlauf auf den Graphbereich. Popup-Steuerelemente bleiben sichtbar, während tiefe oder stark verzweigte Konjugationen lesbar bleiben.

Definitionstransformationen können außerdem geordnete lokalisierte `replacements` deklarieren. Die erste passende Ersetzung schreibt eine frühere Transformation um, bevor eine Ausweichvorlage verwendet wird. Dadurch sind kontextabhängige Ketten wie `to (want to) exist` → `to (have wanted to) exist` möglich; Vorlagen mit `{{ definition }}` können stattdessen Bedeutungen anhängen, etwa `to (want to) exist (and then)`. Der unveränderte Eintrag wird als zentrierte Stammkarte über der ersten Transformationsreihe angezeigt.

Ein Satzverweis kann `transformation: { "setId": "...", "path": ["rule-id", "..."] }` deklarieren. Cognis prüft, ob der Pfad auf den referenzierten Grundeintrag anwendbar ist, speichert ihn mit der Beziehung und löst die genaue erzeugte Form ohne Bezeichnungsheuristiken auf. Eine transformierte Detailansicht verwendet die normale Kindmarkierung für **Von: {übergeordnet}**; durch Auswahl dieser Zuordnung wird das kanonische Verb oder Adverb geöffnet.
Die ersatzweise Titelzusammensetzung folgt der Bibliothekshierarchie: Sätze können auf Wörter, Wörter auf zusammengesetzte und atomare Schrifteinheiten und zusammengesetzte Schrifteinheiten auf atomare Schrifteinheiten verweisen. Ein homografischer Wortschatzeintrag wird daher nie als Schreibbestandteil eines anderen Wortschatzeintrags behandelt; Einträge wie die japanischen Lesungen für Blume und Nase `はな` verweisen jeweils unabhängig auf `は` und `な`.

Die Inline-Kartenerstellung übernimmt jetzt vorgemerkte Zeichenauswahlen für die Aussprache vor dem Speichern. Wird eine bereits durch eine Suche gelieferte Lesung gespeichert, werden ihre ausgewählten Zeichen verknüpft, ohne die Aussprache zu duplizieren. Suchwerte werden sofort im Zeilenformat der Ausspracheliste angezeigt; automatisch zusammengesetzte Wort- und Satzlesungen bleiben bei Änderungen der Haupteingabe sichtbar. Detailüberschriften ordnen Lesegruppen anhand ihrer vollständigen Lesung statt ihrer Listenposition zu und können unverknüpfte Lesungen mit kanonischen Schriftzeichenkarten verbinden.

Überschriften und Lesungen transformierter Vokabeln verlinken die kanonischen Schrifteinheiten der angezeigten Form. „Verwendet von“ berücksichtigt außerdem vollständige kanonische Schreibweisen und Aussprachezusammensetzungen, sodass zusammengesetzte Kana auch dann zurückverweisen, wenn gespeicherte Referenzen kleinere Einheiten nennen. Direkte Beziehungen bleiben sichtbar; unvollständige Zusammensetzungen erzeugen keine Teilverknüpfungen.

Beziehungslisten in der Detailansicht zeigen unmittelbare Nachbarn. „Verwendet von“, Verwendungsbeispiele und der Beziehungsbaum schließen abhängige Einträge aus, die ausschließlich über einen weiteren übergeordneten Schreibungs- oder Ausspracheeintrag erreichbar sind, einschließlich gruppierter Referenzen. Direkte Links bleiben verfügbar, und zyklische Referenzen führen nicht zu wiederholter Traversierung. Ähnliche Elemente zeigen weiterhin Einträge derselben Ebene.

Eine direkte Beziehung bleibt sichtbar, auch wenn ein Weg über einen Zwischeneintrag dieselbe Karte erreicht. Gespeicherte Referenzen, gruppierte Referenzen und kanonische Titelbestandteile behalten ihre direkten Links. Damit werden sowohl あ → ある + あるく als auch あ → ある → あるく unterstützt. Nur Beziehungen, die ausschließlich über einen weiteren übergeordneten Eintrag erreichbar sind, werden ausgeschlossen.

Neue Wortkarten erkennen beim Abschließen der Eingabe und vor dem Speichern automatisch wörterbuchgestützte Klassen und unterstützte Transformationstags. Eigene Tags bleiben erhalten; mehrdeutige Klassen erfordern eine Auswahl. Verspätete Ergebnisse ändern keinen anderen Entwurf. Vorschauen für gewählte Verb-, Adjektiv-/Adverb- und Pluralformen fordern deren eigene Aufnahme an. Die Herkunftsangabe in der Überschrift verlinkt die Basiskarte. Upload-Felder haben einen eigenen Selektor, damit Audioelemente die Initialisierung des Zeicheneditors nicht mehr abbrechen.

Beim Schreiben von Abhängigkeiten wird nun die Sichtbarkeit jeder Verbindung geprüft, einschließlich gruppierter Referenzen. Persönliche Karten dürfen lesbare geteilte Karten und eigene private Bestandteile verwenden; Klassenkarten benötigen globale Bestandteile oder Bestandteile derselben Klasse; globale Karten benötigen globale Bestandteile. Änderungsvorschläge prüfen das Referenzschema vor der Einreichung. Veröffentlichungen prüfen die aktuellen Abhängigkeiten bei der Genehmigung erneut, und Änderungen dürfen eine ausstehende Veröffentlichung nicht ungültig machen. Geteilte Inhalte können nicht in den persönlichen Bereich zurückkehren, solange geteilte abhängige Karten oder ausstehende Anfragen ihre größere Sichtbarkeit benötigen. Berechtigungshinweise werden nach Erstellung und Bearbeitung zurückgegeben und berücksichtigen Schreibrechte der Klasse.

Beim Löschen werden alle löschbaren abhängigen Karten mit Kaskaden- oder Einschränkungsregel bestätigt, einschließlich gruppierter Referenzen. Karten mit Trennungsregel bleiben erhalten. Die Transaktion prüft Eigentum, Klassenzugriff, Schutz und ausstehende Prüfungen jeder betroffenen Karte, bevor etwas gelöscht wird. Einschränkungen scheitern nicht mehr an der Reihenfolge der Kaskadensuche. Bei zu geringer Sichtbarkeit von Abhängigkeiten bietet die Erstellung eine persönliche Speicherung an. Die Veröffentlichungshilfe kann zunächst geeignete unterste Bestandteile einschließlich verborgener Definitionen anfragen; nach ihrer Genehmigung kann die übergeordnete Karte eingereicht werden.

Der Server plant die Löschbestätigung anhand der gespeicherten Schemaversionen und berücksichtigt abhängige Karten, die auf der aktuellen Seite fehlen. Der Study-Gateway-Client stellt die schreibgeschützte Löschprüfung bereit.

## Wörterbuchimport und Entwürfe

Wörterbuchergebnisse lassen sich vor der Übernahme von Aussprachen, Klassifikationen, Tags, Verweisen und einzelnen Bedeutungen prüfen. Importierte Aussprachen erscheinen sofort mit denselben Bedienelementen wie manuell gespeicherte Aussprachen. Generierte Aussprachen reagieren auf Änderungen der Haupteingabe und erhalten eigene Alternativen. Pflichtreiter zeigen eine Markierung; die Aktion zum Hinzufügen einer Definition ist kompakt.

Der allgemeine Lookup-Vertrag unterstützt `class`, `tags`, `definitions` (lokalisierte Übersetzungen und Herkunft) sowie `sourceUrl`. Anbieterspezifische Daten gehören in deklarierte Felder; das japanische Modul verwendet das verborgene Feld `dictionary_data` für den vollständigen Jisho-Datensatz. Umfangsregeln, Konflikterkennung, Abhängigkeitsprüfung und Bereinigung beim Abbrechen gelten auch für importierte Definitionen.

Fehlende Übersetzungen abrufen verwendet `POST /api/v1/study/library/definitions/localize` mit `{ translations, languages }`. Fehlende UI-Sprachen werden über `localization:translateString` angefordert, vorhandene Übersetzungen bleiben erhalten. Bei fehlenden oder fehlerhaften Anbietern werden `missingLanguages` gemeldet. Fehlende Texte können bearbeitet werden; englische Texte werden nicht in andere Sprachfelder kopiert. Die Aktion steht auch beim manuellen Hinzufügen von Definitionen bereit.

## Administrator-Karten und gezielte Strichsuche

Administratoren erstellen Karten ohne Veröffentlichungsfelder direkt im globalen Namensraum. Inline erstellte und aus Wörterbüchern importierte Definitionen verwenden dasselbe globale Ziel; private Abhängigkeiten müssen vor dem Speichern veröffentlicht werden. Die Suche im Feld Strichmuster übernimmt das Muster des Anbieters sofort, ohne die Wörterbuchvorschau zu öffnen.

## Suche füllt den offenen Karteneditor

Die Wörterbuchsuche füllt den offenen Karteneditor direkt und übernimmt alle zurückgegebenen Definitionen und Aussprachen ohne Ergebnisfenster oder Übernahmeschritt. Bestehende Werte erfordern vor der Anfrage eine Bestätigung zum Ersetzen; Abbruch und leere oder fehlgeschlagene Suchen erhalten die aktuelle Karte. Eine erfolgreiche Strichmustersuche blendet ihre Schaltfläche aus. Wörterbuch-Quelladressen bleiben als unsichtbare Quelldaten gespeichert statt als Links angezeigt zu werden.

## Auflösbare Importe und editierbare Definitionen

Wörterbuchimporte ordnen Anbieter-Datensatzkennungen vor dem Verknüpfen den zugänglichen installierten Karten zu, auch für gruppierte Links. Fehlende oder mehrdeutige Ziele lassen die Werte mit einer Warnung unverknüpft, statt das Speichern zu verhindern. Übernommene Definitionen bieten eine Bearbeiten-Aktion über den bestehenden berechtigungsabhängigen Karteneditor; gespeicherte Änderungen aktualisieren ihre Zusammenfassung. Versteckte Schemafelder, einschließlich Wörterbuch-Quelldaten, erscheinen nicht im Formular, behalten aber ihre gespeicherten Werte.

## Korrekturen am Karteneditor

Die Strichsuche wird ausgeblendet, sobald ein abgerufenes Muster vorhanden ist, auch bei Wörterbuchergebnissen und gespeicherten Karten. Das Löschen des Musters zeigt die Suche wieder an. Definitionseditoren zeigen Übersetzungen unter Inhalt und lassen den überflüssigen Reiter Definitionen weg. Durch Semikolon getrennte Wörterbuchbedeutungen werden einzeln übernommen; zugeordnete Übersetzungen und ursprüngliche Quelldaten bleiben erhalten. Strukturierte Bedeutungen ersetzen Verknüpfungen zu zusammengefassten Quelldefinitionen.

## Aussprache aus dem Wörterbuch

Wörterbuchimporte lösen vollständige Aussprachen über die längsten vollständigen Treffer in installierte Kana auf. Zusammengesetzte Zeichen wie きょ und っく sowie wiederholte Positionen bleiben erhalten. Kanonische Eintragskennungen werden in geordneten Lesegruppen gespeichert; Lesungen mit fehlenden Zeichen werden nicht teilweise verknüpft. Definitionen verwenden passende Karten erneut oder erstellen Karten über den normalen Editorablauf. Karussells bleiben der wichtigste Weg zur Erstellung untergeordneter Karten. Zeichen und Partikeln bleiben schreibgeschützte, vom Anbieter verwaltete Ebenen. Satzeditoren bieten keine Wörterbuchsuche an.

## Wörterbuchtreffer auswählen

Die Vokabelerstellung verwendet eine zusammengesetzte Karteneingabe ohne die überflüssige Überschrift Eingabe. Die Wörterbuchsuche steht direkt darunter und durchsucht den gesamten Text einschließlich ausgewählter Komponenten. Aussprachen werden manuell eingegeben oder aus dem Wörterbuch übernommen, statt aus Kanji-Lesungen erzeugt zu werden. Ein Treffer füllt den Editor direkt; mehrere Treffer öffnen eine horizontale Liste von Kartenvorschauen mit der Überschrift „Mehrere Treffer gefunden“. Nach Auswahl und Bestätigung werden Felder, Aussprachen, Definitionen, Schlagwörter und Beziehungen übernommen. Die Bestätigung bleibt bis zur Auswahl deaktiviert. Abbrechen bewahrt den aktuellen Editor und erstellt keine Definitionen. Vom Wörterbuch bestätigter Kartentext kann gespeichert werden; spätere Textänderungen erfordern erneut eine Auflösung. Die Aussprache von Sätzen wird weiterhin aus ihren Bestandteilen abgeleitet; ihre Wörterbuchsuche bleibt deaktiviert.

## Vokabeleingabe bleibt erhalten

Die Wörterbuchsuche für Vokabeln behält den eingegebenen Text, die Reihenfolge der Bestandteile und die ausgewählten Eingabekarten bei und übernimmt ergänzende Felder, Aussprachen und Definitionen. Das Formular verwendet passende Definitionen mit demselben normalisierten Vergleich wie die API erneut; neu importierte Definitionen werden sofort zwischengespeichert, damit wiederholte Bedeutungen keine Konflikte verursachen. Die Wiederverwendung berücksichtigt den Zielbereich und erhält vorhandene Übersetzungen.

## Transformierte Sätze und Bereiche

Satzerstellung, Bearbeitung und Detailansicht leiten Aussprachen aus der gewählten Transformation jeder geordneten Referenz ab. Wiederholte Stammformen behalten getrennte Positionen und Transformationspfade. Deklarierte Satzzeichen bleiben sichtbar, ohne angrenzende Titellinks zu verhindern; Links in Titel und Aussprache öffnen die gewählte Form mit Rücknavigation zum Stamm. Bereichswechsel führen den registrierten Study-Library-Ablauf aus, liefern aktualisierte Berechtigungen und behalten eigene Karten nach dem Verschieben sichtbar. Die Aktion heißt „Verschieben nach: Benutzer“, da geteilte Karten in den Benutzerbereich ihres ursprünglichen Erstellers zurückkehren. Anbieterkarten, geteilte abhängige Karten, offene Anträge und Zugriffsbeschränkungen verhindern weiterhin ungültige Verschiebungen. Die Beitragsregeln verbieten ausdrücklich das Ankündigen von Fähigkeiten, Aktionen, Routen oder Abläufen ohne ausführbare Implementierung.

## Schlanke Komponenten

Eingabevalidierung, Bezeichnermuster, Definitionssprachen und Variantenrichtungen verwenden gemeinsame fokussierte Hilfsfunktionen. Inhaltsaudio besitzt eigene Module, und Inhaltspakete verwenden unmittelbar stabile Datensatzidentitäten.

## Wörterbuchsuche und Cache

Cognis Core verwaltet den Wörterbuchcache über `core:cache`. Eine gespeicherte Anfrage wird nach einer Stunde kalt; bei der nächsten Nutzung prüft Cognis den Anbieter auf Änderungen. Geänderte Ergebnisse bleiben bis zur Zwölf-Stunden-Grenze vorgemerkt, unveränderte Inhalte bleiben erhalten. Gleichzeitige Anfragen teilen eine Prüfung; fehlgeschlagene Prüfungen behalten das letzte erfolgreiche Ergebnis. Der Zustand übersteht Neustarts. Module laden Anbieterdaten, planen aber weder Anfragen noch eigene Antwortcaches. Jisho bietet keinen schlanken Änderungsfeed, daher benötigt eine Prüfung die normale Suchantwort. Es gibt keine manuelle Aktualisierungsschaltfläche. Aussprache- und Kartenlinks werden stets anhand aktuell zugänglicher Inhalte aufgelöst.

## Prüfung und Bereichswechsel

Administratoren und Eigentümer verschieben persönliche Karten direkt in berechtigte gemeinsame Bereiche; Lernende reichen Prüfanfragen ein. Text und Zielsymbol bilden gemeinsam die Schaltfläche. Anfragen zeigen die eingereichte Karte, Änderungsvorschläge, Bereich, Autor, Zeitangaben, Status und kompakte berechtigte Aktionen. Auch zurückgezogene Entscheidungen bleiben sichtbar. Kartenänderung und Entscheidung erfolgen in einer Datenbanktransaktion mit bedingtem Statuswechsel. Ungültige, veraltete und wiederholte Entscheidungen werden abgewiesen. Gespeicherte Einreichungen erhalten den geprüften Inhalt und verhindern die Genehmigung nach Änderungen an der Quelle.

## Effiziente Wörterbuchauflösung

Wörterbuchergebnisse erscheinen nach erfolgreichem Laden der Referenzen. Vorschauen laden nur referenzierte Eintrags- oder Anbieter-IDs sowie die für Aussprachen benötigten Zeichen. Die vollständige Karussellbibliothek wird beim Öffnen des Editors oder einer verknüpften Karte geladen. Eintragslisten laden Referenzen gemeinsam statt pro Karte. Anfragen verwenden vorhandene Zeilen und lesen keine Quellen für unberechtigte oder abgeschlossene Anfragen. Suche und Prüfung verwenden denselben Sichtbarkeitsfilter für versteckte Felder. Abgelaufene Cachezeilen werden beim Schreiben über einen Ablaufindex entfernt. Genehmigte Verschiebungen rufen innerhalb der Entscheidungstransaktion denselben registrierten Ablauf wie direkte Verschiebungen auf.

Auch Cachetreffer rufen den registrierten Suchablauf auf, sodass Erweiterungshooks einheitlich greifen.

Die Studiennavigation fordert nur offene Prüfungen an; die Anfrageseite behält den vollständigen Statusverlauf.

Meine Anfragen zeigt alle eingereichten Status nur lesend. Ausstehend ist die einzige Prüfwarteschlange. Kopfzeilen zeigen Profilbilder und Links für Antragsteller und Prüfer; der Entscheidungszeitpunkt steht am Statuskennzeichen. Kartentitel, primäre Aussprache und Definition bilden eine aufklappbare Zusammenfassung; verwandte Karten sind nach Beziehung gruppiert. Sichtbarkeitseinschränkungen verwenden den Abbrechen-Stil. Gegensätzliche Verschiebungsrichtungen oder unveränderte Ziele deaktivieren die Schaltfläche, bis die widersprüchliche Auswahl entfernt wird.

## Lesungsgraphen aus dem Wörterbuch

Wörterbuch-Quelldaten bleiben unsichtbare Metadaten in Formularen und Detailansichten. Importierte Aussprachen verwenden verborgene Vokabel-Lesungen im selben Bereich wie ihre übergeordnete Karte. Kanji mit mehreren Lesungen erhalten je einen verborgenen Datensatz mit Titelverweis zum Kanji und geordneten Kana-Verweisen; Kanji mit einer Lesung verweisen direkt auf Kana. Vollständige Wortlesungen verwenden verfügbare passende Kanji-Lesungssegmente und verbleibende Kana. Definitionen werden direkt mit den verborgenen Lesungen verknüpft. Cognis löst Anbieteridentitäten auf und speichert den Graphen atomar mit normaler Feld-, Ebenen-, Abhängigkeits- und ACL-Prüfung. Zeichen und Partikeln bleiben anbieterverwaltet. Redundante Katakana-Wiederholungen einer gleichwertigen Hiragana-Lesung werden herausgefiltert, sofern das Wörterbuch keine entsprechende Katakana-Schreibweise angibt; verbindliche On-Lesungen und echte Lehnwortlesungen bleiben erhalten.

## Validierte Operationsstufen

Wiederholte Wörterbuchimporte verwenden passende verborgene Lesungskarten statt Konflikte zu erzeugen. Validierung und Speicherung laufen in ihren benannten ctx-Stufen; Bearbeitungen besitzen einen Update-Flow und abgelehnte Hooks rollen Schreibvorgänge zurück. Ungültige Suchanfragen erhalten sichere Validierungscodes, unerwartete interne Fehler allgemeine Serverfehler. Gemeinsame Definitionsvalidierung liegt im komponenteneigenen reuse-Bereich.

Core 0.3.109 · Library 2.24.43 · Study 1.8.44

## Komposition und Verschieben

Beim Überfahren einer Karussellkarte werden alle passenden Platzierungen hervorgehoben; Positionszähler entfallen. Zeigerziehen ordnet einzelne Platzierungen ohne Textauswahl neu. Eingetippte Verben öffnen die breitere zweispaltige Transformationsauswahl. Verknüpfte Definitionen lassen sich über den Papierkorb entfernen und behalten die Wörterbuchreihenfolge. Erneutes Binden ersetzt alte Ereignislistener; Sammellöschungen öffnen nur eine Bestätigung.

Das Verschieben geteilter Karten in den privaten Bereich verlangt eine Bestätigung und einen administrativ geprüften Antrag, auch für Administratoren. Die Freigabe berechnet unzugängliche abhängige Karten erneut und löscht deren Kaskaden atomar mit dem Verschieben; kompatible private Karten bleiben erhalten. Geschützte Karten, Anbieterinhalte und ausstehende abhängige Anträge verhindern die Freigabe. Normale Löschberechtigungen bleiben unverändert. Erfolgreiche Anträge zeigen eine Meldung; Eigentümer gelöschter Karten erhalten Benachrichtigungen der Kategorie Study. Der Endpunkt move-to-personal liefert jetzt HTTP 201 mit einem ausstehenden Antrag statt einer verschobenen Karte.

## Wörterbuchtransformationen

Transformationskarten richten Titel, Lesungen und Definitionen in einer gemeinsamen Spalte aus. Die Grundform-Aktion verwendet den neutralen Schaltflächenstil. Beim Ziehen zeigt eine vertikale Einfügemarke die Position vor oder nach der Zielplatzierung. Jisho-Importe speichern unterstützte Konjugationsfamilien als Vokabel-Tags; neu erstellte Verben öffnen vor dem Einfügen die Transformationsauswahl. Adverbien behalten ihre Wortart; das aktuelle japanische Schema definiert keine Adverb-Transformationen.

Wörterbuchanbieter können prerequisites als Liste von { key, layer, label } zurückgeben. Nach Auswahl eines Treffers im Editor löst Cognis vorhandene zusammengesetzte Schriftkarten im vorgesehenen Sichtbarkeitsbereich auf oder ruft fehlende Karten ab und erstellt sie samt Definitionen und Lesungsgraph. Atomare Zeichen und Partikeln können so nicht erstellt werden. Alias-Schlüssel werden in der Hauptkarte und versteckten Lesungen durch kanonische IDs ersetzt. Die Vokabeleingabe bleibt erhalten; importierte Schriftverweise gelten nur, solange die Eingabe der Suche entspricht. Das Anzeigen von Suchergebnissen erstellt keine abhängigen Karten.

Fehlende Pflichtfelder werden vor dem Speichern über registrierte ergänzende Anbieter vervollständigt; Kanji-Strichmuster stammen von KanjiVG. Jedes Kanji wird zusammen mit seinen Definitionen und versteckten Lesungen als ein validierter Graph im vorgesehenen Sichtbarkeitsbereich gespeichert.

## Kartenidentität und Import

Bei Zusammenführungskonflikten wird der registrierte Ablauf ausgeführt: Administratoren übernehmen Ergänzungen sofort, Lernende beantragen eine Prüfung für gemeinsame Karten. Die ursprüngliche Eingabezusammensetzung und Einzelwerte bleiben erhalten; alternative Lesungen, Bedeutungen, Tags und zulässige verborgene Lesekarten werden ergänzt. Private Abhängigkeiten dürfen nicht in gemeinsame Graphen gelangen; fehlgeschlagene Zusammenführungen behalten den Entwurf. Wörterbuchtreffer gleicher Zusammensetzung bündeln Lesungen und Bedeutungen. Erweiterte Schreibweisen werden bei Auswahl sofort übernommen; Weiter oder Schließen verwendet die genaue Zusammensetzung. Importierte Lesungen werden über verborgene Karten in einzelne Kana aufgelöst. Beim Bearbeiten werden alte gruppierte Verknüpfungen ersetzt. Erfolgreiche Erstellung zeigt eine Meldung. Karussells mit derselben Beziehung behalten gegenseitig ihre Auswahl, einschließlich Satzverbindungen.

Filter entsprechen den sichtbaren Inhalten der gewählten Ebene. Verschieben behält die Kartenidentität und speichert `relocatedAt`; verschobene Karten werden auch bei wiederholtem Wechsel zwischen privater und gemeinsamer Sichtbarkeit nicht als neu gemeldet. Neue globale Karten und neue Anbieterinhalte erhalten weiterhin Benachrichtigungen. Anfragen speichern den ursprünglichen nachgelagerten Kartenkontext mit Details und Bedeutungen. Berechtigte Verlaufsansichten behalten ihn nach dem Verschieben; gelöschte Quellkarten werden als nicht verfügbar angezeigt.

## Layout verschachtelter Karten

Aufgeklappte Kinder belegen die nächsten freien Positionen am aktiven Zweig; abgeblendete Hintergrundkarten verdrängen sie nicht quer durch das Raster. Bereits platzierte Vorfahren bleiben beim Öffnen tieferer Kinder stabil. Benötigt der Zweig mehr Höhe, reserviert das Raster zusätzlichen scrollbar erreichbaren Platz und gibt ihn beim Schließen frei. Größenänderungen des Fensters oder der Karten lösen eine neue Platzierung aus. Zeiger und Tastaturfokus steuern die Zweigsichtbarkeit einheitlich; langes Drücken auf ein Kind setzt den aktuellen Zweig fort. Ausstehende Layoutberechnungen werden zusammengefasst und beim Schließen abgebrochen.

[Strukturierter Bibliotheksimport](/docs/adapters/study/library/import)

## Study-Ansicht und Favoriten

Flashcards öffnet eine Übersicht eigener Decks, mit dem Konto geteilter Decks und vollständiger Startdecks aktivierter Sprachanbieter. Linkfreigaben behalten ihre Zugriffsregeln und bilden kein öffentliches Verzeichnis. Das +-Menü rechts oben bietet Deck erstellen und Deck importieren. Erkunden, Library und Flashcards verwenden gespeicherte Study-Favoriten und gemeinsame Sortierung (Anbieterreihenfolge, A–Z, Z–A, neueste oder älteste zuerst). Der goldene Stern filtert die Ergebnisse nach Favoriten. Library-Einträge, Decks und einzelne Lernkarten haben getrennte Favoriten. Favoriten gewähren keinen zusätzlichen Zugriff. Das Zeichenfeld beendet seine Sitzung bei Routenwechseln und überschreibt keine Composer- oder Shell-Klassen.

## Wörterbuch-Suchergebnisse

Wörterbuchsuchen öffnen `/study/library/search` ohne URL-Parameter. Der Gateway-Client speichert Abfrage, Sprache und Anbieter kontobezogen auf dem Server; die authentifizierte Sitzung liest diesen Zustand, andere Konten erhalten keinen Zugriff. Mehrere Treffer erscheinen als horizontal scrollbare Vorschauen. Die Auswahl aktualisiert eine einzelne Detailansicht und erhält die Scrollposition. Ein Treffer öffnet direkt die Detailansicht. Abzeichen erscheinen nur einmal, Anbieter-Rohdaten bleiben verborgen. Die Kartenerstellung verwendet den bestehenden Composer und die Abhängigkeitsauflösung. Cache-Ablauf und Aktualisierung bleiben Aufgabe von Cognis Core.

## Optionale Wortformen und erreichbare Vorschauen

Jeder Formensatz deklariert ein erforderliches `flag`, etwa `transform:verb` oder `transform:plural`, neben seinen grammatischen `matchTags`. Nur entsprechend markierte Basiskarten aktivieren die Gruppe. Unbekannte oder wirkungslose Flags scheitern an der Validierung. Formen sind schreibgeschützte Ansichten mit der kanonischen Basis-UUID und `{setId, path}`; eigenständige Formenkarten dürfen weder erstellt noch importiert oder ausgeliefert werden. Echte Homografen mit anderer grammatischer Klasse bleiben zulässig.

Die ausdrückliche Titelkomposition von Sätzen erhält Leerraum zwischen verknüpften Bestandteilen, einschließlich Mehrwortkarten und ausgewählter Transformationen. Abstände bleiben einfacher Text; kanonische Wörter und Satzzeichen bleiben navigierbar. Fehlende Bestandteile oder nicht deklarierte Satzzeichen führen weiterhin zur Ablehnung unvollständiger Kompositionen.

## Ausspracheaufnahmen

Bootstrap verlangt `study:audio:provider` und registriert neben Wörterbuch- und Strichanbietern einen entfernbaren Audioanbieter. Dieser löst mitgelieferte Aufnahmen nach gesprochener Bezeichnung und bevorzugter Lesung auf, mit begrenzten Dateizugriffen und ausdrücklichen Fehlern bei fehlendem Audio. Beim Entfernen werden laufende Abrufe abgebrochen. Cognis prüft den Kartenzugriff, leitet gewählte Transformationstexte aus dem Schema ab und speichert Aufnahmen privat über Files, ohne verfasste Felder zu ändern. Der Ablauf `study:library:audio` führt Autorisierung, Validierung und Auflösung aus; `study:audio:fetch` prüft und liest die Bytes des Anbieters. Sätze behalten die geordnete Wiedergabe ihrer Bestandteile.

Die Startaufnahmen verwenden das offline betriebene mehrsprachige neuronale Kokoro-Modell mit `bf_emma` für Englisch und `jf_alpha` für Japanisch. Die Clips haben 128 kbit/s, 200 ms Vorlauf, 180 ms Nachlauf, begrenzte Spitzennormalisierung und langsameres Sprechtempo. Modellherkunft und Apache-Lizenz stehen in `data/audio/VOICE-LICENSE.txt`.

Audio wird erst abgerufen, wenn Lernende die Wiedergabe anfordern; das bloße Öffnen einer Karte löst keine Audioanfrage aus. Wiedergabefehler verwenden den lokalisierten Toast des Hosts und strukturierte Protokolle. Satzbestandteile behalten ihre gewählten Transformationsdeskriptoren; der authentifizierte Audioendpunkt leitet die gesprochene Form aus dem Schema ab, statt beliebigen Anzeigetext anzunehmen. Englische Buchstabenkombinationen werden aus ihren verfassten IPA-Phonemen synthetisiert, während Alphabetaufnahmen Buchstabennamen sprechen.

## Wörterbuchaudio und Host-Cache

Fehlt eine angeforderte Aussprache im Paket, ruft English Study das Wort über die English Dictionary API ab und lädt eine passende MP3 von deren Aussprache-Medienendpunkt. Eine bevorzugte IPA-Lesung muss übereinstimmen; eine andere Aussprache wird niemals ersatzweise verwendet. Nur HTTPS-Medien auf `api.dictionaryapi.dev` sind erlaubt. Weiterleitungen werden abgelehnt, Abfrage und Download teilen eine Frist, und beide Antworten haben Byte-Grenzen beim Streaming. Fehlende Aufnahmen bleiben ausdrückliche Fehler. Google-Sprachdienste werden nicht verwendet.

Cognis verwaltet den Aufnahme-Cache, nicht das Modul. Nach der Autorisierung verwendet sein privater Files-Cache erfolgreiche Aufnahmen über Karten und Neustarts hinweg wieder. Gleichzeitige Wiedergabeanfragen teilen Abruf und Speicherung. Schlüssel enthalten Anbieteridentität, Revision, Sprache, Rolle, Bezeichnung und Lesungen; geänderte Lesungen oder Anbieterrevisionen werden getrennt aufgelöst. Fehlgeschlagene Anfragen oder Schreibvorgänge können erneut versucht werden. Das Modul kontaktiert das Wörterbuch nur bei einer Wiedergabeanforderung ohne Cache-Treffer.

## Wiedergabe mit Pausen und manueller Ersatz

Satzkarten können ein optionales Audiofeld besitzen. Beim ersten Abspielen prüft Cognis den Zugriff auf jeden Bestandteil, wählt nur die erste Aussprachegruppe, wendet gewählte Transformationen an und erzeugt eine durchgehende WAV mit stillem Vorlauf und gezielten Wort-, Komma- und Satzpausen. Die Aufnahme wird privat zwischengespeichert; Bestandteildaten, Lesungen, Transformationen und Pausen bestimmen die Identität. Neue und vorhandene Karten werden bei Bedarf verarbeitet. Eine im normalen Editor hochgeladene Audiodatei ersetzt die generierte Wiedergabe sofort. Nach Entfernen dieser Datei erfolgt wieder die automatische Zusammensetzung. Anbieter liefern Wortaufnahmen; Cognis verwaltet Zusammensetzung und Cache.

## Abdeckung der Referenzverzeichnisse

Der japanische Referenzkatalog umfasst alle 13.108 Zeichen der mitgelieferten offiziellen KANJIDIC2-Daten. Der englische Katalog enthält alle 135.969 lexikalischen Einträge von Open English WordNet mit 127.311 normalisierten Schlüsseln. Es sind eigenständige, bedarfsgeladene Wörterbuchanbieter und keine 149.077 sofort importierten Startkarten. In der Study-Suche das Referenzwörterbuch wählen, um unterstützte Einträge über die normale Graphprüfung zu importieren. Fehlende Bedeutungen und nutzbare Lesungen bleiben unbekannt; Aussprache, Übersetzungen und Strichbilder werden nicht erfunden. Das Verzeichnis umfasst weder alle Unicode-Han-Zeichen noch jedes denkbare englische Wort.

Japanische Kanji-Lesungen werden nach häufigen JMdict-Belegen und verfügbaren Häufigkeitsmarkern einschließlich Okurigana-Formen geordnet. Gruppierte Verweise und Startaufnahmen folgen genau dieser Reihenfolge. Kanji-Audio verwendet immer die erste verfasste Aussprache. Vorhandene englische Wortkarten haben jeweils eine IPA-Lesung; Referenzeinträge bewahren die Quellreihenfolge innerhalb der bevorzugten britischen Varietät vor anderen Varietäten. Aussprachehäufigkeit hängt vom Kontext ab; die Quellen liefern keine allgemeingültige Rangfolge für jede Lesung.

Referenzdateien werden mit `python3 scripts/import-reference.py --source <source-file>` erstellt; Japanisch unterstützt `--priorities <reading-priorities.json>`. `data/reference/manifest.json` enthält Quellprüfsumme, Herkunft, Anzahlen und Datei-Hashes. Nur die Dateien angefragter Schlüssel werden geladen; Laufzeitergebnisse verwenden den Cognis-Cache.

## Vollständige Ausspracheaufnahmen der Referenzdaten

Japanisch enthält zusätzlich 2.913 neuronale Aufnahmen vollständiger Lesungen in begrenzten Dateien unter `data/audio/reference/`. Zusammen mit den Startaufnahmen decken sie die erste Lesung aller 12.356 Quellzeichen mit bekannter Lesung ab; für die übrigen 752 Zeichen werden keine Aussprachen erfunden. Der Index wählt die erste verfasste Lesung und prüft Dateigrenzen und Abbruch. Mit `python3 scripts/reference-audio.py plan --work <directory>` einen Plan erstellen, dessen Verzeichnisse mit dem Syntheseskript verarbeiten und mit `pack` die begrenzten Dateien schreiben.

Das japanische Sortierwerkzeug akzeptiert `--dictionary <JMdict.gz> --kanji-dictionary <KANJIDIC2.xml.gz> --output <priorities.json>` und optional `--content-root data/library/content`. Es bevorzugt häufige eigenständige Wortlesungen, ordnet weitere Lesungen nach häufigkeitsgewichteten Zuordnungen belegter Wörter und erhält geprüfte Einzelkarten-Vorgaben aus `data/audio/primary-readings.json`. Stimmhaftigkeit und Gemination werden auf kanonische Quelllesungen zurückgeführt. Kun-, On- und Namenslesungen bleiben verfügbar; allein die erste ausgewählte Lesung bestimmt Wiedergabe und Cache-Identität. Häufigkeitsmarker dienen der Reihenfolge und sind keine allgemeingültige Aussprachemessung.

Die automatische Zusammensetzung benötigt Aufnahmen für ihre gesprochenen Bestandteile. Fehlende Aufnahmen bleiben ausdrückliche Fehler und lassen sich über das normale Audio-Upload-Feld ergänzen. Nicht mit dem Paketalphabet verknüpfbare Schreibweisen behalten Quelltext und Bedeutungen ohne erfundene Schreibverweise.

## Schreibantworten verbergen

Die Überschrift des Zeichenfelds verbirgt zunächst das Zeichen hinter einer normalen Schaltfläche zum Aufdecken. Ein anderes Zeichen wird erneut verborgen. Schwebende Sitzungen melden ihre aktuelle Karte über die entfernbare Fähigkeit `study:drawing:observe`. Die passende Bibliotheksvorschau bleibt geöffnet, unscharf und nicht bedienbar, bis das Feld ein anderes Zeichen lädt oder geschlossen wird; Lesung und Bedeutung bleiben im Zeichenfeld verfügbar. Eingebettetes Schreiben nutzt dieselbe Verdeckung und meldet Aufdecken als unterstützten Versuch.

## Leserückmeldung und Links

Explore-Kartenlinks enthalten die kanonische Kartenkennung unter `/study/explore/<language>/<layer>/<card-id>`. Strg-, Befehls- und Umschalt-Klick behalten das normale Browserverhalten; direkte Aufrufe öffnen die gewünschte Kartenvorschau. Das Nachschlagen einer unbeantworteten Karte zählt als unterstützter Versuch. Bei normaler Navigation bleibt die Stapelreihenfolge für die Zurück-Funktion erhalten.

## Gespeicherte Lernsteuerung

Neue Wortkarten erkennen beim Abschließen der Eingabe und vor dem Speichern automatisch wörterbuchgestützte Klassen und unterstützte Transformationstags. Eigene Tags bleiben erhalten; mehrdeutige Klassen erfordern eine Auswahl. Verspätete Ergebnisse ändern keinen anderen Entwurf. Vorschauen für gewählte Verb-, Adjektiv-/Adverb- und Pluralformen fordern deren eigene Aufnahme an. Die Herkunftsangabe in der Überschrift verlinkt die Basiskarte. Upload-Felder haben einen eigenen Selektor, damit Audioelemente die Initialisierung des Zeicheneditors nicht mehr abbrechen.

## Referenzbilder und Prüfung

Karten können ein optionales Feld `imageList` mit `input.control: "imageFiles"` deklarieren. Im Karteneditor lassen sich PNG-, JPEG-, WebP- oder GIF-Dateien mit jeweils bis zu 5 MiB hochladen; die Detailansicht zeigt die Bilder. Gebündelte Bilder verwenden relative Pfade im Asset-Verzeichnis des Inhaltspakets und behalten ihre Lizenzangaben. Hochgeladene Dateien bleiben privat und sind nur über eine berechtigte Karte oder Anfrage abrufbar. `PUT /api/v1/study/library/images` nimmt Bilddaten entgegen; `GET /api/v1/study/library/entries/:id/images/:field/:index` liefert ein Kartenbild. Berechtigte Anfragevorschauen verwenden den entsprechenden Pfad unter `push-requests`.

Anfragen zeigen reguläre Kartenvorschauen. Eine vorgeschlagene Karte einer offenen Anfrage lässt sich zur Bearbeitung des Entwurfs öffnen; `PATCH /api/v1/study/library/push-requests/:id` ist Administratoren vorbehalten. Das Speichern verändert die veröffentlichte Karte noch nicht. Die Genehmigung übernimmt den Entwurf und gibt dem Einreicher sowie den bearbeitenden Administratoren gemeinsame Eigentümerschaft; unverändertes Speichern fügt niemanden hinzu. Profilvorschauen kennzeichnen Einreicher und Genehmiger ausdrücklich. Genehmigen, Ablehnen und Zurückziehen verlangen jeweils eine Bestätigung. Aktivierte Administratoren erhalten im Kanal Study Benachrichtigungen über neue Anfragen und Entscheidungen anderer Benutzer. Der Navigationslink für Anfragen bleibt statisch.

Die Suchsteuerung enthält einen sofortigen Textfilter für die bereits geladenen Karten. Er wird mit ausgewählten Filtern und Favoriten kombiniert.

## Medien und Zustellung

Referenzbilder erscheinen nun als Vorschaubilder im Library-Editor und dessen schreibgeschützter Detailansicht, einschließlich der mitgelieferten Modulbilder. Bei Mauszeiger oder Tastaturfokus erscheint ein rotes Entfernen-Steuerelement; auf Touchscreens bleibt es sichtbar. Entfernen verlangt keine Bestätigung, leert Entwurf und Dateiauswahl und verwirft unbenutzte vorläufige Uploads. Das Schließen eines ungespeicherten Editors gibt Vorschauen und vorläufige Dateien ebenfalls frei. Gespeicherte Karten und der Anfrageverlauf behalten ihre referenzierten Bilder. Die Entfernen-Schaltfläche hat einen deckenden Hintergrund und bleibt über Fotos lesbar. Eigene Bilddateien und gespeicherte Verweise bleiben bei Serverneustarts und erneutem Laden der Anbieter erhalten, auch bei Anbieteraktualisierungen bearbeiteter Karten.

Mikrofonaufnahmen warten auf die Berechtigungsantwort des Browsers. Währenddessen werden doppelte Anfragen und Speichern verhindert. Ein erst nach dem Schließen gewährter Stream wird freigegeben. Verweigerte Berechtigungen und nicht verfügbare Aufnahmen haben eigene Meldungen. Mikrofon, Wiedergabe und Neu laden stehen gleich groß in einer Zeile. Der Kollektivplural verwendet ein einziges Kontrollkästchen für passende Substantivfamilien; unpassende Optionen bleiben verborgen. Audiodateinamen bleiben verborgen. Wiedergabe spielt den neuesten vorläufigen Upload oder die Mikrofonaufnahme; eine verspätete Antwort für gespeichertes Audio ersetzt sie nicht. Während der Aufnahme wird nur das Mikrofonsymbol rot, auch beim Darüberfahren; die Schaltfläche behält ihren normalen Themenstil.

Study-Benachrichtigungen lösen aktuelle Fähigkeiten erst bei der Zustellung auf. Startreihenfolge und erneute Komponentenaktivierung deaktivieren die Zustellung dadurch nicht dauerhaft. Die Zustellquittung wird geprüft: Ohne erfolgreichen Sender wird ein Fehler gemeldet, Teilfehler werden protokolliert und erfolgreiche Empfänger und Sender sind nachvollziehbar.

Die globale Fähigkeit `ui:imagePreview` bietet Vorschaubilder, Ereignisbindung und die Aktion `open` über den registrierten Ablauf `ui:imagePreview:open`. Sie ist außerdem über `ui:reuse` als `image-preview.js` verfügbar; der Anbieter lädt das gemeinsame Stylesheet vor der Veröffentlichung der Steuerelemente. Bildschaltflächen öffnen das Original in natürlicher Größe, begrenzt auf den sichtbaren Bereich, wobei nur das übliche X sichtbar ist. Tastaturbedienung, Escape, Fokusrückkehr und das Schließen beim Entfernen der Ansicht oder des Anbieters nutzen den gemeinsamen Popup-Lebenszyklus. Aufrufer verwalten Bild-URLs und optionale Löschaktionen. Library verwendet dieses Steuerelement für hochgeladene und mitgelieferte Bilder im Editor und in Detailgalerien.

Der gemeinsame Bildvorschau-Anbieter lädt sein Stylesheet, bevor er Steuerelemente veröffentlicht. Das reine Bild-Popup entfernt Überschriften und passt Originale im Quer-, Hoch- und Panoramaformat ohne horizontales oder vertikales Scrollen in den sichtbaren Bereich ein. Library-Detailvorschauen behalten ihre Grenzen von 20rem × 18rem; Editor-Vorschaubilder bleiben 8rem × 6rem groß.

## Studienmedien

Referenzbilder in Kartendetails bilden einen horizontalen Streifen mit ausgeblendeter Bildlaufleiste. Die Audiowiedergabe übermittelt Kartentitel, Ebene, Cognis als Interpret und das App-Symbol an die System-Mediensteuerung, einschließlich Wiedergabe, Pause, Stopp und Lebenszyklusbereinigung. Mitgelieferte Satzdateien haben Vorrang vor der erzeugten Zusammenstellung. Die Begleitmodule enthalten 34 japanische und 45 englische direkte Satzaufnahmen; 124 japanische Kana-Clips wurden mit japanischem Text und der ausdrücklich festgelegten Stimme neu erzeugt.

## Audio neu erzeugen

Beim erneuten Erzeugen der Aufnahme einer globalen Karte werden nur das Audiofeld und der Suchindex aktualisiert. Erforderliche Identität, Schema, Klassifikation, Eigentümer, eigene Medien und gruppierte Verknüpfungen bleiben erhalten. Eine optimistische Zeitstempelprüfung weist gleichzeitige Änderungen zurück, statt sie zu überschreiben. Bei späterer Wiedergabe wird die neu erzeugte Aufnahme aus dem Cache verwendet.

## Aussprache entfernen

Gespeicherte Aussprachefelder ordnen ihre Entfernen-Schaltfläche mit eigenem Abstand neben den Lesekomponenten an, auch bei Schreibrichtung von rechts nach links. Das X verdeckt weder kurze noch lange Lesungen.

## Isolation deaktivierter Lernsprachen

Study Library prüft die aktive Sprachfunktion, bevor gespeicherte Schemata, Karten, Audio, Bilder, Paketdateien oder Prüfanfragen zugänglich sind. Deaktivierte Sprachen verschwinden aus Listen und direkte Abrufe schlagen fehl. Erneutes Aktivieren stellt den Zugriff ohne Löschen der Inhalte wieder her. Laufzeitregistrierungen und Inhaltsspeicherung bleiben getrennt.

## Aktive Sprachregistrierung verwenden

Die Bibliotheksverfügbarkeit liest Sprachbeiträge aus der aktuellen Systemregistrierung statt aus dem lokalen Funktionsspeicher des Adapters. Das Deaktivieren einer Sprache lässt Schemata, Karten und Startdeck-Abhängigkeiten der anderen Sprache zugänglich; erneutes Aktivieren stellt gespeicherte Inhalte wieder bereit. Die öffentliche Registrierung hat Vorrang vor veralteten lokalen Kopien.

Verbindliche Paketaktualisierungen erhalten ausgelassene Anbietereinträge, die von eigenen oder bearbeiteten Anbieterkarten weiterhin erreichbar sind. Der Schutz folgt rekursiven Abhängigkeiten und Zyklen; überholte Inhalte ohne solche Verweise können weiter entfernt werden.

Die passende Kartenvorschau im Explore-Raster wird unscharf und nicht interaktiv, solange ihr Zeichen im Zeichenfeld geöffnet ist. Wiederholte und neu gerenderte Platzierungen folgen demselben Zustand; Zeichenwechsel, Schließen des Zeichenfelds oder Verlassen der Seite stellen sie ohne Größenänderung wieder her.

## Benachrichtigungen einmal dekodieren

Anfragebenachrichtigungen dekodieren XML-Entitäten in einem Durchlauf und setzen Konto- und Anfragewerte einmal als unveränderte Daten ein. Kodierte Entitätstexte bleiben auf der nächsten Ebene kodiert. Leere oder fehlende Texte der bevorzugten Sprache verwenden den englischen Wert; fehlt auch dieser, wird ein Fehler ausgelöst. Die vier Ressourcenkataloge werden für die Lebensdauer des Benachrichtigungsdienstes zwischengespeichert; fehlgeschlagene Lesezugriffe können erneut versucht werden.

## Generierte Wortformen

Jeder Formensatz deklariert ein erforderliches `flag`, etwa `transform:verb` oder `transform:plural`, neben seinen grammatischen `matchTags`. Nur entsprechend markierte Basiskarten aktivieren die Gruppe. Unbekannte oder wirkungslose Flags scheitern an der Validierung. Formen sind schreibgeschützte Ansichten mit der kanonischen Basis-UUID und `{setId, path}`; eigenständige Formenkarten dürfen weder erstellt noch importiert oder ausgeliefert werden. Echte Homografen mit anderer grammatischer Klasse bleiben zulässig.

Regeln verändern Schreibweise und Aussprache durch Entfernen und Anfügen von Suffixen, optionale Präfixoperationen, geordnete `suffixes`-Alternativen und lemmaabhängige `forms` für unregelmäßige Grammatik. Überschreibungen ersetzen die allgemeine Textoperation. Pfade verbinden mehrere Zustände einschließlich mehrteiliger Formen; wachsende Zyklen scheitern. Definitionstemplates werden einmal interpoliert, eingesetzter Text bleibt unverändert.

Detailansichten, Satzprüfung und Audio nutzen denselben Resolver. Generierte Ansichten behalten Referenzbilder, entfernen jedoch die Audio- und Strichfelder der Basis. Die Audiosuche verwendet generierte Schreibweise und Hauptaussprache; eine Neugenerierung verändert die Basiskarte nicht. Zeichenübungen setzen die generierte Schreibweise aus Schreibmustern zusammen, behalten Strichgruppen bei und ignorieren Leerzeichen. Aufnahmetests verlangen für jede aktivierte Regel einen pfadgebundenen Clip. Gespeicherte Formenkarten und Kompatibilitätsaliase werden nicht unterstützt.

Der öffentliche Anbietervertrag deklariert `transformationModel: "generated"`; beide Sprachmodule verlangen dies vor der Anbieterregistrierung. Jede Regel einer aktivierten Gruppe muss für die Ausgangskarte auflösbar sein. Mit `resultClass` kann eine Regel die grammatische Klasse ändern, etwa vom Adjektiv zum Adverb. Ungültige explizite Referenzen scheitern, statt die Grundform einzusetzen.

Der Library-UI-Anbieter veröffentlicht `study:library:presentation.titleComposition(detail, schemas)` für Verbraucher, die kanonische, geordnete Titelbestandteile benötigen. Er löst verfasste Referenzgruppen, wörtlichen Text und ausgewählte Transformationen mit derselben Logik wie Library-Detailtitel auf. Beim Deaktivieren des Anbieters wird die Fähigkeit entfernt. Flashcards benötigt diesen Anbieter und zeigt jeden verknüpften Titelbestandteil als themenabhängige Schaltfläche; beim Wechsel zu Explore bleibt die ausgewählte Transformation erhalten.

## Kuratierte Lernklassifikationen

`detail.tags` einer Ebene legt ausdrücklich fest, welche lokalisierten Tags als Lernmerkmale erscheinen; interne Tags bleiben für Transformationen und Bearbeitung gespeichert. Nur mit `filterable` markierte Tags werden Filter. Optionsbeschriftungen sind lokalisiert; Filter folgen der vom Anbieter festgelegten Reihenfolge. Optionale Felder können mit `detail.autoSelectSingle: false` ohne Anfangsauswahl starten.

Ein Zeichenkettenfeld kann `derivation: { kind: "rankedReferences", relationships, values, requireAll, transformationValues }` deklarieren. Die Werte reichen von leicht bis schwer. Die Auflösung nutzt kanonische Referenz-IDs; ausgewählte Transformationsregeln tragen ihre deklarierten Stufen bei. Ein gespeicherter Feldwert legt eine grammatische Mindestanforderung fest. Sätze entsprechen genau der höchsten Anforderung: N5 + N4 ergibt N4; reine N5-Sätze und Sätze mit N3-Inhalten passen nicht zu N4. Fehlende, mehrdeutige oder unzugängliche Einstufungen bleiben bei `requireAll` unklassifiziert. Die Auflösung wird pro Darstellung zwischengespeichert, verändert keine gespeicherten Karten und folgt Änderungen der referenzierten Inhalte.

## Generische Schwierigkeitsprofile

Beide Study-Module verwenden das kanonische Feld `difficulty_level`. Identische Normalisierung und Vertragstests lesen `data/library/difficulty.json`; Beschriftungen, geordnete Optionen, Quelltag-Zuordnungen, Grundstufen und Transformationsanforderungen sind Daten. Japanisch zeigt JLPT N5–N1, Englisch verwendet die bestehenden Kategorien Anfänger/Mittelstufe/Fortgeschritten. Unbekannte Werte bleiben unklassifiziert. Der Host ordnet deklarierte Felder ohne sprachspezifische Regeln oder alternative Feldnamen ein.

## Jede geöffnete Karte als angesehen markieren

Das Öffnen von Details über Direktlinks, Beziehungen oder Vor-/Zurück-Navigation speichert die kanonische Karte für den angemeldeten Benutzer als angesehen. Dasselbe gilt für den Editor. Erfolgreiche Schreibvorgänge entfernen passende Vorschaumarker und aktualisieren den lokalen Zustand; gleichzeitiges Überfahren und Öffnen teilt denselben Vorgang. Fehler bleiben wiederholbar, ohne Details zu blockieren. Fehlgeschlagene oder abgebrochene Öffnungen markieren keine ungesehenen Karten; geöffnete Details zeigen kein veraltetes Neu-Merkmal.

Optionale Einzelauswahlfelder enthalten die lokalisierte Auswahl **Nicht angegeben**. Beim Bearbeiten einer nicht eingestuften Karte bleibt ihre unbekannte Schwierigkeit erhalten, statt stillschweigend die erste Stufe zu wählen.

Lesezugriffe auf den Wörterbuchsuchkontext verwenden `study:library:readSearchContext` mit Autorisierung und Auflösung. Schreibzugriffe behalten `study:library:searchContext` und prüfen Eingaben vor dem Speichern; Erweiterungen können sie vor der Dienstvalidierung anpassen. Beide Vorgänge weisen Identitäten geteilter Links zurück. Schreibzugriffe stoppen bei 16 KiB mit HTTP 413; fehlerhaftes JSON liefert HTTP 400 und ersetzt keinen gespeicherten Zustand. Unerwartete Fehler geben nur einen stabilen Fehlercode zurück.

## Benachrichtigungen und Speicherung

Mitteilungen über neue und entfernte Library-Inhalte enthalten englische, deutsche, indonesische und japanische Texte aus XML-Katalogen, nutzen Englisch als Ersatz und durchlaufen `study:library:notifyContent`. Kartenbeschriftungen werden bei der Ersetzung nicht erneut interpretiert. Auch privilegierte Schreibvorgänge benötigen eine vorhandene Klasse. Leaderboard-Beobachtungen werden bei Speicherfehlern zurückgesetzt; der Saisonwechsel berechnet nach einem Neustart die endgültige Rangliste neu und stellt bei Speicherfehlern den Zustand wieder her. Verifizierte Administratoren können passende Integrationsbindungen ohne Raummitgliedschaft lösen.
