# Lernsteuerung und Zugriff

**Feature-Zweig:** feature-update-external-package-contract-definitions

## Lernkarten üben

Lesen oder Schreiben wird für eigene und geteilte Stapel über eine dauerhaft gespeicherte Einstellung im schwebenden Menü gewählt. Der Modus bleibt während der Sitzung fest, auch nach einem Besuch in Erkunden und der Rückkehr über die Browser-Zurück-Funktion; ein Wechsel erfordert die Bestätigung, den Fortschritt zurückzusetzen. Nicht unterstützte Karten können ohne automatischen Moduswechsel übersprungen werden. Neue Karten beginnen mit verborgener Antwort. Alle, Neu, Fällig und Erledigt behalten ihre Prüfungsfilter; ein Filterwechsel beginnt eine neue Warteschlange im selben Modus.

Lesen verwendet die erste Aussprache und drei unterschiedliche sichtbare Bibliotheksalternativen. Schreiben bettet das gemeinsame Zeichenfeld ein und zeigt Bedeutung und Lesung, während das Zeichen hinter einer anklickbaren Überschrift verborgen bleibt. Fehlstriche zeigen das Zeichen nicht automatisch. Aufdecken gilt als unterstützter Versuch mit dem Ergebnis Erneut, auch wenn spätere Striche gelingen. Ein erfolgreicher Versuch ohne Hilfe ergibt Gut. Bereits geprüfte Karten können weiterhin betrachtet werden.

Galerien verwenden `/study/<iso>/flashcards`; Stapellinks erhalten lesbare Namen mit dem Suffix `--<deck-id>`, etwa `/study/ja/flashcards/first-japanese-words--<deck-id>`. Kanonische englische Namen halten den lesbaren Teil unabhängig von der Oberflächensprache. Das Identitätssuffix unterscheidet gleiche Namen und hält Links zwischen Eigentümern und Empfängern mit unterschiedlichen Stapelkatalogen konsistent. API-Ressourcen-IDs bleiben unverändert.

Die aktuelle Browser-Verlaufseintragung bewahrt Stapelreihenfolge, Position, Bewertungen, offene Antwort, Filter und Modus. Nach der Rückkehr aus Erkunden funktionieren Vorherige und Nächste im ursprünglichen Stapel. Das Aufdecken oder Nachschlagen einer unbeantworteten Karte behält das Ergebnis Erneut. Quelllinks übergeben geordnete Karten-IDs im Verlaufszustand, damit auch Erkunden-Vorschauen durch den Stapel einschließlich untergeordneter Karten navigieren. Bibliotheksberechtigungen gelten weiterhin; nicht mehr zugängliche Karten werden bei der Wiederherstellung ausgelassen.

Alle Aktionen verwenden die bestehenden deklarierten Stapel- und Zeichenabläufe. Die Oberfläche nutzt Standarddialoge, Schaltflächen und vorhandene Lernkartenstile. Eigene und geteilte Stapel teilen Darstellung und Übung; geteilte Momentaufnahmen erhalten keinen Bibliothekszugriff. Beim Verlassen werden Ereignisbehandlung und Zeichenfeld beendet.

## Leserückmeldung und Links

Leseantworten zeigen eine Erfolgs- oder Warnmeldung und animieren die gewählte Option; bei reduzierter Bewegung entfällt die Animation. Kartentitel und Favoritenstern haben einen transparenten Hintergrund und behalten sichtbare Tastatur-Fokusmarkierungen. Das Standard-Seitenmenü listet die Stapeltitel der aktuellen Sprache und hebt den aktiven Stapel hervor.

Explore-Kartenlinks enthalten die kanonische Kartenkennung unter `/study/explore/<language>/<layer>/<card-id>`. Strg-, Befehls- und Umschalt-Klick behalten das normale Browserverhalten; direkte Aufrufe öffnen die gewünschte Kartenvorschau. Das Nachschlagen einer unbeantworteten Karte zählt als unterstützter Versuch. Bei normaler Navigation bleibt die Stapelreihenfolge für die Zurück-Funktion erhalten.

## Gespeicherte Lernsteuerung

Lesen/Schreiben ist eine gespeicherte Kontoeinstellung im schwebenden Composer-Menü; Standard ist Lesen. Ein Wechsel während der Übung zeigt vor dem Neustart den gemeinsamen Warndialog. Abbrechen behält Position und Antworten; bereits übermittelte Bewertungen bleiben gespeichert. Die Seitenleiste enthält Alle und markiert den aktuellen Stapel. Schreibüberschriften verwischen ein gleich großes maskiertes Zeichen. Der erste Klick deckt es auf und aktiviert den Explore-Direktlink; ein zweiter Klick bietet die Navigation mit Bestätigung an. Die Tastaturbedienung folgt demselben Ablauf.

Neue Wortkarten erkennen beim Abschließen der Eingabe und vor dem Speichern automatisch wörterbuchgestützte Klassen und unterstützte Transformationstags. Eigene Tags bleiben erhalten; mehrdeutige Klassen erfordern eine Auswahl. Verspätete Ergebnisse ändern keinen anderen Entwurf. Vorschauen für gewählte Verb-, Adjektiv-/Adverb- und Pluralformen fordern deren eigene Aufnahme an. Die Herkunftsangabe in der Überschrift verlinkt die Basiskarte. Upload-Felder haben einen eigenen Selektor, damit Audioelemente die Initialisierung des Zeicheneditors nicht mehr abbrechen.

Die Wörterbuchauswahl verwendet theme-select und wird bei einem einzigen Anbieter ausgeblendet. Einstellungen steht rechts neben der Wörterbuchsuche. KANJIDIC2 ergänzt Kanji-Daten und ist keine Suchoption neben Jisho; Referenzquellen zeigen ihren tatsächlichen Katalognamen.

Japanische Aufnahmen mit kleinen Kana, einschließlich 学校, wurden mit Kanji-Schreibweise, soweit vorhanden, der festgelegten japanischen Stimme und stabilen Einstellungen neu erzeugt. Mitgelieferte Sätze werden aus genau diesen Clips neu zusammengesetzt. I- und Na-Adjektive unterstützen Adverbial-, Verneinungs- und Vergangenheitsformen mit eigenen Aufnahmen der mitgelieferten Formen. Englische Pluralaufnahmen bleiben eigenständige Dateien und werden bei gewählter Form abgespielt.

## Kartenmedien und Steuerung

Optionale Bildlistenfelder, private Bild-Uploads und Detailgalerien ergänzen. Beide Sprachmodule enthalten ein lizenziertes Referenzfoto und bieten das Feld auf jeder Ebene an. Vorschaubilder im Editor zeigen gebündelte und hochgeladene Bilder. Bei Mauszeiger oder Fokus erscheint eine rote Schaltfläche zum Entfernen, die unbenutzte vorläufige Dateien ohne Bestätigung verwirft. Gespeicherte Karten und der Anfrageverlauf behalten ihre referenzierten Dateien. Die Entfernen-Schaltfläche hat einen deckenden Hintergrund und bleibt über Fotos lesbar. Eigene Bilddateien und gespeicherte Verweise bleiben bei Serverneustarts und erneutem Laden der Anbieter erhalten, auch bei Anbieteraktualisierungen bearbeiteter Karten. Die globale Fähigkeit `ui:imagePreview` bietet Vorschaubilder, Ereignisbindung und die Aktion `open` über den registrierten Ablauf `ui:imagePreview:open`. Sie ist außerdem über `ui:reuse` als `image-preview.js` verfügbar; das Stylesheet gehört zu den gemeinsamen Stilen. Bildschaltflächen öffnen das Original in natürlicher Größe, begrenzt auf den sichtbaren Bereich, wobei nur das übliche X sichtbar ist. Tastaturbedienung, Escape, Fokusrückkehr und das Schließen beim Entfernen der Ansicht oder des Anbieters nutzen den gemeinsamen Popup-Lebenszyklus. Aufrufer verwalten Bild-URLs und optionale Löschaktionen. Library verwendet dieses Steuerelement für hochgeladene und mitgelieferte Bilder im Editor und in Detailgalerien.

Mikrofonaufnahmen warten auf die Berechtigungsantwort des Browsers. Währenddessen werden doppelte Anfragen und Speichern verhindert. Ein erst nach dem Schließen gewährter Stream wird freigegeben. Verweigerte Berechtigungen und nicht verfügbare Aufnahmen haben eigene Meldungen. Mikrofon, Wiedergabe und Neu laden stehen gleich groß in einer Zeile. Der Kollektivplural verwendet ein einziges Kontrollkästchen für passende Substantivfamilien; unpassende Optionen bleiben verborgen. Audiodateinamen bleiben verborgen. Wiedergabe spielt den neuesten vorläufigen Upload oder die Mikrofonaufnahme; eine verspätete Antwort für gespeichertes Audio ersetzt sie nicht. Während der Aufnahme wird nur das Mikrofonsymbol rot, auch beim Darüberfahren; die Schaltfläche behält ihren normalen Themenstil.

## Bearbeitbare Anfragevorschauen

Reguläre Kartenvorschauen und den vorhandenen Editor für Änderungen an Kartenentwürfen durch Administratoren verwenden. Die Genehmigung erhält die Zuordnung zum Einreicher und fügt bearbeitende Administratoren als Miteigentümer hinzu. Profile von Einreicher und Genehmiger klar beschriften; Genehmigung, Ablehnung und Rücknahme bestätigen.

## Study-Mitteilungen und Filter

Aktivierte Administratoren im Kanal Study über neue Anfragen und Entscheidungen anderer Administratoren informieren. Pulsierende Navigation entfernen, sofortige Textfilter für geladene Karten ergänzen und das Lernkarten-Seitenmenü im Dokumentfluss halten, um Verschiebungen durch Scrollleisten zu vermeiden. Benachrichtigungsfähigkeiten werden bei der Zustellung aufgelöst. Zustellquittungen werden einschließlich leerer Empfängerlisten und Teilfehler geprüft.

## Zugriff und Abfragekosten

Rückwärtsverweise auf Karten wenden dieselben Prüfungen für Sprachverfügbarkeit und Zugriff wie direkte Lesezugriffe an und enthalten aktuelle Bearbeitungsrechte. Beim Durchsuchen werden Schreibrechte einer Klasse nur innerhalb einer Antwort gemeinsam geprüft; das vollständige Schema wird nicht mehr für jede Karte kopiert. Öffentliche Schemaergebnisse bleiben unabhängige Kopien. Der Import von Inhaltspaketen indiziert Dateien einmal und schreibt jede gemeinsam verwendete Aufnahme einmal, wobei alle Audiozuordnungen erhalten bleiben.

## Überschriften und Zeichenhilfe

Verlinkte Popup-Titel behalten ihre kompakte Textdarstellung und geerbte Typografie auch dann, wenn gemeinsame Schaltflächenstile später geladen werden. Die Hilfeschaltfläche des Zeichenfelds zeigt stets das vollständige nummerierte Strichmuster, einschließlich abgeschlossener Striche und aller Gruppen, auch nach Beginn der Übung oder bei bereits abgeschlossenen Zeichen. Im normalen Übungsablauf bleibt der nächste Strich sichtbar; ein neuer Strich setzt die Aufdeckung zurück.

## Automatische Wörterbuchinhalte

Wörterbuchimporte lösen noch nicht verknüpfte Karteninhalte vollständig in geordnete Verweise auf vorhandene Zeichenkarten des aktiven Schemas und der konfigurierten Eingabekarussells auf. Wiederholte Kana und gemischte Schreibeinheiten behalten ihre Positionen; gelieferte Kompositionsverweise und Wörterbuchlesungen bleiben maßgeblich. Unvollständige Treffer bleiben zur manuellen Auflösung verfügbar. Bei einem vollständigen Sequenzvorschlag für manuell eingegebenen Text wird der redundante Einzelzeichenvorschlag ausgeblendet.

## Wiederhergestellte Lernfunktionen

Fortschritt, Ranglisten, Punkteberechnung und Kontingentverwaltung sind über ihre zuständigen Komponenten verfügbar. Zeichen- und Karteikartenergebnisse verwenden den Fortschrittsadapter; unterstützte Antworten gelten nicht als selbstständig richtig. Geteilte Stapel laden aktuelle Bibliothekseinträge anhand ihrer ID; importierte Notizen behalten eine eigene kanonische Identität. Leseantworten verwenden lokalisierte Definitionen und Zeichenlesungen. Ausspracheelemente verwenden kanonische Zeichenverweise; abgeschlossene Wörterbuchabfragen werden ausgeblendet, Bibliothekskarten sind bearbeitbar und Zeitstempelgleichstände werden anhand der Bibliotheksreihenfolge aufgelöst.

## Zuverlässige Lernergebnisse

Klassenberechtigungen und Erwähnungen verwenden den aktuellen Klassenvertrag und prüfen Mitgliedschaften erneut. Inhaltsaktualisierungen erhalten ausgelassene Einträge, die eigene Karten oder bearbeitete Anbieterkarten weiterhin rekursiv referenzieren. Wiederholte Antwortübermittlungen behalten ihre Versuchskennung über die Navigation hinweg und aktualisieren Zeitplan und Fortschritt nur einmal. Zeichenversuche vermeiden doppelte Ereignisse und Schwierigkeitssteigerungen. Kanonische JSON-Ereignisse ermöglichen die Wiederherstellung unterbrochener Fortschrittsprojektionen. Ranglistenspeicherung erholt sich nach Fehlern, erfordert dauerhaften Speicher und prüft Klassenzugriff bei jedem Aufruf. Geteilte Stapel verwenden aktuelle Schemata und Bibliotheksdaten. Die Produktionsverträge für Study entsprechen den Laufzeitschnittstellen, einschließlich Schema-Standardwerten und Audiodekodierung.

## Gemeinsame UI-Verantwortung

Study verwendet den vom Host verwalteten Ablauf `ui:pageOverlay.create({ signal, bottomInset })` für die Grenzen des schwebenden Zeichenfelds. Diese folgen Änderungen an Seite, Kopfzeile, Fußzeile und Ansichtsfenster, ohne das Seitenlayout zu verändern. Beim Schließen der Ansicht oder Entladen des Providers werden Beobachter, Listener und Element entfernt. Eingebettete Zeichenfelder behalten ihren übergebenen Container.

Popup-Überschriften behalten ihre bisherige Typografie und ihr responsives Layout über `headingLayout: "annotated"` mit den neutralen Detailpositionen `aside` und `below`. Die Popup-API bietet `appendHeadingAccessory(element)` und `setContentConcealed(boolean)`. Die Verdeckung zeichnet Überschrift und Inhalt unscharf, blockiert Interaktionen und stellt anschließend den vorherigen Barrierefreiheitszustand wieder her. Study gestaltet nur eigene Bedienelemente. Die Navigation nutzt `ui:navbarLinks`, einschließlich deaktivierter Links mit lokalisierten Erklärungen, und entfernt beim Entladen ihren Link und die Suchregistrierung.

## Dauerhafte Übungsbelohnungen

Study lädt UUID-Abhängigkeiten und erforderliche Kern-Capabilities aus den Adaptermanifesten. Abhängigkeiten starten vor Verbrauchern; nach dem Deaktivieren wird die Verfügbarkeit erneut berechnet. Fehlende Abhängigkeiten sperren Zeichenübungen, Karteikarten und Ranglisten. Zeichenendpunkte liefern 503, wenn Bibliothek oder Fortschritt fehlen. Fortschrittsprojektionen verwenden datenbanksichere Identitäten. Vertrauenswürdige Übungen speichern XP, Erfolge und nachweisgestützte Ranglisten dauerhaft. Die Belohnungszustellung folgt auf die Karteikartentransaktion; Wiederholungen behalten genau ein Ereignis, einen Belohnungsbeleg und eine Zeitplanänderung.

Zeitplan und Versuchsbeleg der Karteikarte werden vor der adapterübergreifenden Belohnungszustellung festgeschrieben. Der getrennte Ablauf `study:decks:recordResult` stellt nach Fehlern dasselbe Ergebnis erneut zu, ohne den Zeitplan nochmals fortzuschreiben. Dadurch entstehen bei der Fortschrittsspeicherung keine verschachtelten Datenbanktransaktionen.

Ledger-Zusammenfassungen, Booster-Einlösung und Aktivitätsentwertung durchlaufen eigene ctx-Abläufe mit Validierungs- und Ausführungsstufen. Ungültige Teilnehmerkennungen werden vor dem Lesen oder Ändern gespeicherter Daten abgelehnt.

Die passende Kartenvorschau im Explore-Raster wird unscharf und nicht interaktiv, solange ihr Zeichen im Zeichenfeld geöffnet ist. Wiederholte und neu gerenderte Platzierungen folgen demselben Zustand; Zeichenwechsel, Schließen des Zeichenfelds oder Verlassen der Seite stellen sie ohne Größenänderung wieder her.

Antwortmöglichkeiten in Lernkarten sind eigenständige Antwortschaltflächen. Kartenüberschriften und aufgedeckte Antworten verwenden interne Aktionen mit Bestätigung beim Verlassen und erhaltener Stapelreihenfolge, ohne Kartenadressen beim Überfahren anzuzeigen. In Explore öffnet ein zweiter Klick auf die aufgedeckte Zeichenüberschrift die Karte direkt über eine Aktion ohne Adresse.

Schreibübungen verwenden nur die maskierte Überschrift des Zeichenfelds. SVG-Pfeile für Zurück/Weiter stehen darüber neben dem Favoriten; Weiter erfordert weiterhin eine Antwort. Flashcards übergibt `suppressRetry: true` an das gemeinsame Zeichenfeld und blendet Wiederholen aus und deaktiviert es; eigenständige Übungen erlauben Wiederholen standardmäßig.

Eingebettete Verbraucher können nach der gemeinsamen Bestätigung `onNavigate(card)` bereitstellen. Flashcards verbucht damit den aktuellen Versuch über den Ablauf zum Verlassen und erhält den Stapelkontext vor dem Öffnen von Explore.

Die Schemainitialisierung erstellt deklarierte Tabellen und ergänzt fehlende Spalten und Indizes. Bestehende Primärschlüssel oder eindeutige Schlüssel werden nicht ersetzt. Der strukturierte Speichervertrag beschreibt keine großen Textfelder: MariaDB-TEXT ist auf 65.535 Byte begrenzt, und mehrbytekodierte zusammengesetzte Schlüssel unterliegen der InnoDB-Schlüsselgrenze. Study-Nutzdaten und Schemaänderungen müssen gegen diese Anbietergrenzen geprüft werden.

Der Browser-Haupteinstieg ist `ui/app/index.js`; Aktionen, Darstellung, Sprache und Übungsmodule liegen daneben. Geteilte Stapel verwenden `ui/app/shared-deck.js`. Serverseitiges Stapelverhalten verwendet `service/index.ts` mit Routen-, Ablauf-, Speicher- und Ergebnismodulen im selben Dienstverzeichnis.

Vorschläge im Karteneditor stehen in einer eigenen Zeile, damit Eingabe und Aussprache-Speichern stabil bleiben. Die Auswahl eines Wörterbuchergebnisses übernimmt unaufgelösten Text als kanonische Zeichenreferenzen, einschließlich ausgeblendeter Schreibeinheiten wie kleinem っ. Bereits übernommene Zusammensetzungen bleiben erhalten; ausgeblendete Einheiten erscheinen nicht in der Übersicht.

Nach Abschluss eines Stapels erscheinen ein zentrierter grüner Haken und Glückwünsche. Startseite führt zu Alle. Erneut versuchen erstellt die ausgewählte Warteschlange anhand des aktuellen Bewertungsstatus neu und beginnt bei der ersten Karte und behält den Fokus Gesamt/Erledigt/Fällig/Neu bei, auch wenn gespeicherte Bewertungen den Kartenstatus verändert haben. Nur Sitzungsantworten und Versuchskennungen werden zurückgesetzt; gespeicherter Lernfortschritt bleibt erhalten. Über Freigabelinks werden dieselbe Abschlussansicht und ein Neustart der temporären Sitzung verwendet.

Die Symbole für Studieneinstellungen, Wörterbuchsuche und Kartenbereich verwenden SVG-Masken mit der Farbe des aktiven Anwendungsthemas. Die Einstellungsmaske erhält keine fremde Hintergrundgrafik mehr. SVG-Dateien werden weiterhin durch ihre bisherigen Komponenten bereitgestellt.

## Zuverlässige Sprachaktivierung

Für den Start externer Module gilt standardmäßig ein begrenztes Zeitfenster von zwei Minuten, damit validierte Inhaltspakete vor der Veröffentlichung ihrer Fähigkeiten vollständig importiert werden können. Ein explizites Zeitlimit des Hosts bleibt wirksam. Bei Fehlern oder Zeitüberschreitung werden registrierte Beiträge entfernt; das Modul bleibt nicht verfügbar. Mitgelieferte Audiodateien werden bei erneuter Aktivierung aus dem versionierten Dateispeicher wiederverwendet; fehlende Dateien werden über das Files-Gateway neu angelegt. Bibliothekseinträge und Beziehungen werden weiterhin abgeglichen, auch bei unveränderten Paketen.

Erneut versuchen wird nur angezeigt, wenn die aktualisierte Warteschlange für den gewählten Fokus Karten enthält. Bei leerem Fokus bleiben die Glückwünsche und die Startseite-Aktion erhalten, ohne einen leeren Neustart anzubieten.

Leseaufgaben zeigen die primäre Aussprache neben dem Kartenwert, wenn beide voneinander abweichen; gleichwertiger normalisierter Text wird nicht wiederholt. Ein rundes Fragezeichen hebt die richtige aktuelle Antwort hervor und fokussiert sie, auch bei gemischter Reihenfolge. Die Nutzung des Hinweises speichert Erneut über den bestehenden Bewertungsablauf; eine anschließend richtige Auswahl bleibt unterstützt. Richtige Antworten ohne Hilfe werden weiterhin als Gut bewertet. Schreibübungen behalten ihre eigenen Hilfefunktionen.

## Zuverlässigkeit und Bereinigung

Einfache Referenzen behalten ihren bestehenden Schlüssel. Gruppierte Platzierungen verwenden study_library_reference_groups mit einer deterministischen reference_id einschließlich Gruppe und Position. Die Schemainitialisierung verschiebt vorhandene gruppierte Zeilen transaktional vor weiteren Schreibvorgängen; bei Fehlern bleibt der bisherige Graph für einen erneuten Versuch erhalten. Lesen, Rückreferenzen, Löschen, Bearbeiten und Bereinigung verwenden beide aktiven Kantenspeicher. Importierte Referenzen werden in Gruppen von 500 Quell-IDs bereinigt, wobei Anbieteränderungen erhalten bleiben. Benachrichtigungen über neue Karten erfolgen erst nach Bestätigung der äußeren Erstellungstransaktion.

Zustände werden an Unicode-Grenzen in Zeilen mit höchstens 60.000 UTF-8-Bytes aufgeteilt und transaktional ersetzt. Bereits einzeilig gespeicherte Zustände verwenden denselben Lesepfad. Die Metadatenmethoden registerDefinition, assignCohort und setParticipation liefern jetzt Promise<void> und müssen abgewartet werden. Sie durchlaufen benannte ctx-Abläufe, geben Speicherfehler weiter und setzen fehlgeschlagene Metadatenänderungen zurück. Auch der Saisonwechsel liefert ein abzuwartendes Promise. Gleichzeitige Registrierungen einer Klassenrangliste teilen einen laufenden Registrierungsvorgang.

Die Standardgrenze für Tresore beträgt 2 MiB, die absolute Verarbeitungsgrenze 8 MiB. Die wirksame Richtlinie wird an Clients zurückgegeben. PUT zählt eingehende Bytes vor dem Puffern oder Parsen und weist übergroße Anfragen zurück; GET prüft die gespeicherte Größe vor dem Parsen. Verschlüsselte Umschläge verwenden eine Basiszeile und begrenzte Folgezeilen mit atomarem Ersetzen und Löschen sowie einer gemeinsamen Leseabfrage. Jeder Abschnitt umfasst höchstens 60.000 UTF-8-Bytes; der Server entschlüsselt weiterhin keine Geheimnisse.

Neue Gruppenräume schließen Schlüsselerzeugung und alle Mitgliedseinträge ab, bevor sie eine Integrationsquelle beanspruchen. Bei Initialisierungs- oder Bindungsfehlern wird der unvollständige Raum gelöscht; Bereinigungsfehler werden protokolliert und weitergegeben. Bestehende Räume und exklusive Quellenbindungen behalten ihr Verhalten.

Der Zeichenfortschritt speichert jede zugestellte Versuchskennung zusammen mit dem Zähler. Ein erneuter Versuch A nach B oder nach einem Neustart erhöht die Schwierigkeit nicht nochmals. Die bestehenden validierten Fortschritts- und Belohnungsintegrationen bleiben aktiv.

Übungen verwenden eine Frage und eine einzige Antwortansicht; Vorder- und Rückseite werden nicht mehr umgedreht. Falsche Antworten, bereits beantwortete Karten und Antwort zeigen behalten die vollständige bibliotheksbasierte Ansicht sowie die Bewertung Erneut bei. Reine Satzstapel verwenden Lesen und blenden den schwebenden Modusschalter aus, ohne die gespeicherte Einstellung für beschreibbare Stapel zu ändern. Gemischte Stapel behalten den gewählten Modus. Sätze und lange Antworten können innerhalb der Seitenbreite bis zu 72rem nutzen. Ungültige Sprachkennungen liefern invalid_language mit HTTP 400.

## Commits

- [f81a683f](https://github.com/Cognis-Labs-HQ/Cognis/commit/f81a683f913c54821501fe475ba3fa317074aedd)
- [581b6928](https://github.com/Cognis-Labs-HQ/Cognis/commit/581b69283476ee95d6f7d65f4a3566332a2ec81a)
- [20d0c172](https://github.com/Cognis-Labs-HQ/Cognis/commit/20d0c172e97697a4aed295b2e25f6346d2b9edfc)
- [5a5d026f](https://github.com/Cognis-Labs-HQ/Cognis/commit/5a5d026f1e4be9b474c3e1f458d3fbe6cd5ac967)
- [b513366e](https://github.com/Cognis-Labs-HQ/Cognis/commit/b513366e7816352a0c357fddfd7b49a881341164)
- [ee448821](https://github.com/Cognis-Labs-HQ/Cognis/commit/ee44882131400a8581dff790e5b7b84a48634641)
- [7f48ca82](https://github.com/Cognis-Labs-HQ/Cognis/commit/7f48ca82ba3dee88919631ef5386697a60450937)
- [95ff5b75](https://github.com/Cognis-Labs-HQ/Cognis/commit/95ff5b7542de1a4d06df974462a917dc2388fae2)
- [e0d5ee9d](https://github.com/Cognis-Labs-HQ/Cognis/commit/e0d5ee9d097422d673f3e34185f71c9e27137e53)
- [337c806e](https://github.com/Cognis-Labs-HQ/Cognis/commit/337c806eaa01da43b3a098a641f618ee9745af43)
- [6d3f8f27](https://github.com/Cognis-Labs-HQ/Cognis/commit/6d3f8f273e8b97a0f97692a52ff3c674eb6f7892)
- [1ae7bd08](https://github.com/Cognis-Labs-HQ/Cognis/commit/1ae7bd08b99d05e23a4c7338b0bc6c680a93f28a)
- [b8edc561](https://github.com/Cognis-Labs-HQ/Cognis/commit/b8edc56133db4bc3ef13aa71ee99f8c5de7ed1f2)
- [9e019c9b](https://github.com/Cognis-Labs-HQ/Cognis/commit/9e019c9b6ffe309e9899c670995952533b9221f0)
- [f30ee3b4](https://github.com/Cognis-Labs-HQ/Cognis/commit/f30ee3b4cffbabe5a006b0ce5b6d3c49dc3838e3)
- [0fc3208a](https://github.com/Cognis-Labs-HQ/Cognis/commit/0fc3208aac734d0a3c621489d789a4a1da5c47de)
- [892b0358](https://github.com/Cognis-Labs-HQ/Cognis/commit/892b0358d506fffaef0f557adf429ff9e82d9fad)
- [d1b3b4cd](https://github.com/Cognis-Labs-HQ/Cognis/commit/d1b3b4cdce25f6db1214112c192fa9aef15ccc08)
