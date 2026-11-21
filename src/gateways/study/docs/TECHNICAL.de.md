# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Lernen.

## Schnittstellen

### Vertrag des Audioanbieters

`study:audio:provider.registerProvider({ id, revision, languages, fetchAudio })` → disposer.

`fetchAudio({ language, label, semanticRole, readings }, signal)` → `{ mediaType, data: Uint8Array }`.

Beide Study-Module verwenden denselben entfernbaren Audioanbieter-Vertrag und rufen mitgelieferte Aufnahmen durch begrenzte lokale Dateizugriffe ab. Autorisierung, Cache-Richtlinien und zusammengesetzte Wiedergabe gehören dem Host.

Die Startaufnahmen verwenden das offline betriebene mehrsprachige neuronale Kokoro-Modell mit `bf_emma` für Englisch und `jf_alpha` für Japanisch. Die Clips haben 128 kbit/s, 200 ms Vorlauf, 180 ms Nachlauf, begrenzte Spitzennormalisierung und langsameres Sprechtempo. Modellherkunft und Apache-Lizenz stehen in `data/audio/VOICE-LICENSE.txt`.

Audio wird erst abgerufen, wenn Lernende die Wiedergabe anfordern; das bloße Öffnen einer Karte löst keine Audioanfrage aus. Wiedergabefehler verwenden den lokalisierten Toast des Hosts und strukturierte Protokolle. Satzbestandteile behalten ihre gewählten Transformationsdeskriptoren; der authentifizierte Audioendpunkt leitet die gesprochene Form aus dem Schema ab, statt beliebigen Anzeigetext anzunehmen. Englische Buchstabenkombinationen werden aus ihren verfassten IPA-Phonemen synthetisiert, während Alphabetaufnahmen Buchstabennamen sprechen.

## Konfiguration

Spracheinschreibung bestimmt Navigation und Inhalte. Module und Adapter registrieren Übungen, Wörterbücher und Seiten; fehlende Anbieter entfernen ihre eigenen Optionen.

## Verhalten

### Ausspracheaufnahmen

Bootstrap verlangt `study:audio:provider` und registriert neben Wörterbuch- und Strichanbietern einen entfernbaren Audioanbieter. Dieser löst mitgelieferte Aufnahmen nach gesprochener Bezeichnung und bevorzugter Lesung auf, mit begrenzten Dateizugriffen und ausdrücklichen Fehlern bei fehlendem Audio. Beim Entfernen werden laufende Abrufe abgebrochen. Cognis prüft den Kartenzugriff, leitet gewählte Transformationstexte aus dem Schema ab und speichert Aufnahmen privat über Files, ohne verfasste Felder zu ändern. Der Ablauf `study:library:audio` führt Autorisierung, Validierung und Auflösung aus; `study:audio:fetch` prüft und liest die Bytes des Anbieters. Sätze behalten die geordnete Wiedergabe ihrer Bestandteile.

### Wörterbuchaudio und Host-Cache

Fehlt eine angeforderte Aussprache im Paket, ruft English Study das Wort über die English Dictionary API ab und lädt eine passende MP3 von deren Aussprache-Medienendpunkt. Eine bevorzugte IPA-Lesung muss übereinstimmen; eine andere Aussprache wird niemals ersatzweise verwendet. Nur HTTPS-Medien auf `api.dictionaryapi.dev` sind erlaubt. Weiterleitungen werden abgelehnt, Abfrage und Download teilen eine Frist, und beide Antworten haben Byte-Grenzen beim Streaming. Fehlende Aufnahmen bleiben ausdrückliche Fehler. Google-Sprachdienste werden nicht verwendet.

Cognis verwaltet den Aufnahme-Cache, nicht das Modul. Nach der Autorisierung verwendet sein privater Files-Cache erfolgreiche Aufnahmen über Karten und Neustarts hinweg wieder. Gleichzeitige Wiedergabeanfragen teilen Abruf und Speicherung. Schlüssel enthalten Anbieteridentität, Revision, Sprache, Rolle, Bezeichnung und Lesungen; geänderte Lesungen oder Anbieterrevisionen werden getrennt aufgelöst. Fehlgeschlagene Anfragen oder Schreibvorgänge können erneut versucht werden. Das Modul kontaktiert das Wörterbuch nur bei einer Wiedergabeanforderung ohne Cache-Treffer.

### Wiedergabe mit Pausen und manueller Ersatz

Satzkarten können ein optionales Audiofeld besitzen. Beim ersten Abspielen prüft Cognis den Zugriff auf jeden Bestandteil, wählt nur die erste Aussprachegruppe, wendet gewählte Transformationen an und erzeugt eine durchgehende WAV mit stillem Vorlauf und gezielten Wort-, Komma- und Satzpausen. Die Aufnahme wird privat zwischengespeichert; Bestandteildaten, Lesungen, Transformationen und Pausen bestimmen die Identität. Neue und vorhandene Karten werden bei Bedarf verarbeitet. Eine im normalen Editor hochgeladene Audiodatei ersetzt die generierte Wiedergabe sofort. Nach Entfernen dieser Datei erfolgt wieder die automatische Zusammensetzung. Anbieter liefern Wortaufnahmen; Cognis verwaltet Zusammensetzung und Cache.

### Transformierte Satzaudios erhalten

Die Satzzusammenstellung fordert die ausgewählte transformierte Schreibweise und erste Aussprache einschließlich mehrstufiger Pfade an. Fehlt die Variantenaufnahme, schlägt die Wiedergabe ausdrücklich fehl, statt Ausspracheverweisen der Grundform zu folgen. Dies gilt auch für direkte Variantenwiedergabe und verschachtelte Bestandteile.

### Verwendung

Der Server plant die Löschbestätigung anhand der gespeicherten Schemaversionen und berücksichtigt abhängige Karten, die auf der aktuellen Seite fehlen. Der Study-Gateway-Client stellt die schreibgeschützte Löschprüfung bereit.

`POST /api/v1/study/library/entries/deletion-plan`

### Study-Navigation

Study-Seiten teilen einen Composer-Platz für die Unternavigation, verwenden gemeinsame Navigations- und Aktionsbeschriftungen aus ui.reuse in allen vier Sprachen und bestimmen die aktive Route beim Rendern. Abgebrochene Router-Bereiche bleiben beim Ersetzen abgebrochen. Fehler der Bildvorschau zeigen eine lokalisierte Meldung und geben die Öffnungssperre für einen weiteren Versuch frei.

Der Zeichenfortschritt speichert jede zugestellte Versuchskennung zusammen mit dem Zähler. Ein erneuter Versuch A nach B oder nach einem Neustart erhöht die Schwierigkeit nicht nochmals. Die bestehenden validierten Fortschritts- und Belohnungsintegrationen bleiben aktiv.

Flashcards verwendet `/study/<iso>/flashcards` und `/study/<iso>/flashcards/<deck-id>`. Die Sprachsteuerung öffnet die entsprechende Galerie und übernimmt kein fremdsprachiges Deck. `/study/flashcards` löst die aktuelle Sprache auf. Bibliothek und Anfragen bleiben gemeinsame Seiten.

### Kompakte Navigation

Auf Telefonen und Tablets stehen Study-Seitenlinks in einer horizontal scrollbaren Zeile; nach Größen- oder Schriftänderungen bleibt die aktive Seite sichtbar. Sprache, Wörterbuchsuche und Einstellungen teilen sich die nächste Zeile. Das Suchsymbol öffnet einen Dialog, der das ursprüngliche Formular, den gewählten Anbieter und die Eingabe erhält. Schließen gibt den Fokus zurück; Navigation oder Desktopgröße schließen den Dialog. Die Übersicht verwendet den Dokumentlauf. Beim Scrollen bleibt die Hauptnavigation erreichbar und die Markenzeile klappt ein.

Sprachnamen werden bei Platzmangel zunächst auf den Sprachcode und dann auf die Flagge verkürzt. Der vollständige Name bleibt als zugängliche Beschriftung und Kurzinfo erhalten. Ohne Flagge bleibt der Code sichtbar. Bei mehr Platz erscheinen wieder die Namen.

### Einheitliche Zeichenfenster

Schwebende Zeichenfelder öffnen sich in einem großen Rahmen, unabhängig vom Seitenverhältnis des Worts oder Musters. Kartenwechsel erhalten Position und manuelle Größenänderungen; Zeichnungen behalten ihre Proportionen.

### Einheitliche Strichführung

Vor der ersten Eingabe zeigt ein noch nicht abgeschlossenes Muster alle Striche. Danach wird über alle Zeichengrenzen hinweg nur der nächste Strich geführt. Bereits abgeschlossene Muster beginnen mit dem nächsten Strich; ausgeblendete Striche zur Wissensprüfung und die Aufdeckfunktion bleiben erhalten.

### Zeichenfortschritt speichern

Abschluss und Anzahl der auszublendenden Striche werden über den Präferenzspeicher je Konto und Karte gespeichert. Jeder Versuch, jedes Zurücksetzen und jede Wiederholung wählt neue zufällige, unterschiedliche Positionen anhand dieser Anzahl. Ein erfolgreicher Abschluss mit höchstens einem Fehler erhöht die Anzahl um eins, begrenzt auf die aktuelle Strichzahl. Abgeschlossene Muster zeigen nur den nächsten Strich; nicht abgeschlossene Muster zeigen vor der Eingabe das gesamte Muster. Authentifizierte GET- und POST-Anfragen an `/api/v1/study/drawing/:cardId` durchlaufen `study:drawing:readProgress` und `study:drawing:complete`; der Browser übermittelt keine Kontoidentität.

Der letzte akzeptierte Strich speichert sofort den Abschluss und die nächste Schwierigkeit. Das Schließen des Zeichenfelds oder Verlassen von Explore bricht das Speichern nicht ab. Beim erneuten Öffnen derselben Karte und bei Wiederholungen wird vor der Auswahl versteckter Striche auf den gespeicherten Fortschritt gewartet.

### Schreibantworten verbergen

Die Überschrift des Zeichenfelds verbirgt zunächst das Zeichen hinter einer normalen Schaltfläche zum Aufdecken. Ein anderes Zeichen wird erneut verborgen. Schwebende Sitzungen melden ihre aktuelle Karte über die entfernbare Fähigkeit `study:drawing:observe`. Die passende Bibliotheksvorschau bleibt geöffnet, unscharf und nicht bedienbar, bis das Feld ein anderes Zeichen lädt oder geschlossen wird; Lesung und Bedeutung bleiben im Zeichenfeld verfügbar. Eingebettetes Schreiben nutzt dieselbe Verdeckung und meldet Aufdecken als unterstützten Versuch.

### Gespeicherte Lernsteuerung

Die Wörterbuchauswahl verwendet theme-select und wird bei einem einzigen Anbieter ausgeblendet. Einstellungen steht rechts neben der Wörterbuchsuche. KANJIDIC2 ergänzt Kanji-Daten und ist keine Suchoption neben Jisho; Referenzquellen zeigen ihren tatsächlichen Katalognamen.

Lesen/Schreiben ist eine gespeicherte Kontoeinstellung im schwebenden Composer-Menü; Standard ist Lesen. Ein Wechsel während der Übung zeigt vor dem Neustart den gemeinsamen Warndialog. Abbrechen behält Position und Antworten; bereits übermittelte Bewertungen bleiben gespeichert. Die Seitenleiste enthält Alle und markiert den aktuellen Stapel. Schreibüberschriften verwischen ein gleich großes maskiertes Zeichen. Der erste Klick deckt es auf und aktiviert den Explore-Direktlink; ein zweiter Klick bietet die Navigation mit Bestätigung an. Die Tastaturbedienung folgt demselben Ablauf.

### Navigation im Schreibfenster

Das Öffnen des Schreibfensters aus den Kartendetails schließt die Detailansicht nach erfolgreichem Öffnen. Der verdeckte Titel wird weiterhin beim ersten Klick sichtbar. Auf Explore öffnet ein weiterer Klick die Karte direkt; auf anderen Study-Seiten bleibt die Bestätigung vor dem Wechsel zu Explore erhalten.

Antwortmöglichkeiten in Lernkarten sind eigenständige Antwortschaltflächen. Kartenüberschriften und aufgedeckte Antworten verwenden interne Aktionen mit Bestätigung beim Verlassen und erhaltener Stapelreihenfolge, ohne Kartenadressen beim Überfahren anzuzeigen. In Explore öffnet ein zweiter Klick auf die aufgedeckte Zeichenüberschrift die Karte direkt über eine Aktion ohne Adresse.

Schreibübungen verwenden nur die maskierte Überschrift des Zeichenfelds. SVG-Pfeile für Zurück/Weiter stehen darüber neben dem Favoriten; Weiter erfordert weiterhin eine Antwort. Flashcards übergibt `suppressRetry: true` an das gemeinsame Zeichenfeld und blendet Wiederholen aus und deaktiviert es; eigenständige Übungen erlauben Wiederholen standardmäßig.

Eingebettete Verbraucher können nach der gemeinsamen Bestätigung `onNavigate(card)` bereitstellen. Flashcards verbucht damit den aktuellen Versuch über den Ablauf zum Verlassen und erhält den Stapelkontext vor dem Öffnen von Explore.

### Erweiterbare Browseraktionen

Library-Browserclients lösen `study:library:client` über ctx auf. Der Anbieter registriert `study:library:<clientFunction>` mit `before`, `execute` und `after` für Lesezugriffe, Wörterbuchaktionen, Anfragen, Importe und Medien. Erforderliche Routenfähigkeiten laden den Anbieter vor dem Einhängen. Erweiterungsargumente, Ablehnung und Lebenszyklus sind in der Dokumentation des Library-Adapters beschrieben.

### Gleichmäßige Übungsauswahl

Zeichenhilfen und das Mischen von Karteikartenantworten verwenden gemeinsam `randomIndex`. Die Funktion nutzt Web Crypto mit maskierter Verwerfungsauswahl für ganzzahlige Bereiche von 1 bis 2^32 ohne Modulo-Verzerrung. Ein Bereich mit einer einzigen Position benötigt keine Entropie. Für deterministische Tests kann eine Entropiequelle übergeben werden; normale Übungen verwenden immer Web Crypto.

### Komponentengrenzen und Laufzeit

Die API delegiert Erweiterungsnamensräume über Richtlinien aktiver Gateways; Study besitzt die Regeln für Sprachnamensräume. Library entfernt seine öffentlichen Funktionen, wenn der Adapter oder seine Study-Abhängigkeiten deaktiviert sind, weist gespeicherte Funktionsreferenzen zurück und registriert sie beim Aktivieren erneut. Study-Adapter verwenden `onAvailabilityChange(listener)` für laufzeitgebundene Beiträge; ein fehlgeschlagener Start entfernt diese.

### Offline lernen

Der Offline-Modus ist in den Einstellungen standardmäßig aktiviert. Deaktivieren stellt die bisherigen Verbindungswarnungen und Fehlermeldungen wieder her und schaltet den Worker-Fallback ab. Bei Aktivierung wechselt die Anwendung bei Verbindungsverlust ohne Fehlermeldung in den Offline-Modus; nicht verfügbare Navigation wird ohne Fehlerdialog blockiert.

Study behält begrenzte, kleine JSON-Schnappschüsse im aktuellen Tab: Schemas, erlaubte Zeichen- und Kartendaten, Speicherorte, gesehene IDs, Favoriten und zuvor geöffnete Kartensätze. Sprachschemas aktivieren dies mit `metadata.offline: { cache: "lightweight" }`. Der Library-Cache umfasst höchstens 16 MB und 100 Lesevorgänge; andere Lesecaches höchstens 4 MB und 100 Lesevorgänge. Audiodaten, Wörterbuchantworten, Zugangsdaten und authentifizierte Dokumente werden nicht dauerhaft gespeichert.

Explore-Vorschauen verwenden bereits autorisierte Cache-Daten. Zeichnen und Lernkarten funktionieren lokal. Abschlüsse, Bewertungen, gesehene IDs und endgültige Favoritenzustände werden zur Übertragung vorgemerkt; Fortschritt, XP und Belohnungen sind erst nach Serverbestätigung verbindlich. Audio sowie Wörterbuch- und ElevenLabs-Abfragen stoppen. Bearbeiten, Löschen und Freigaben benötigen eine Verbindung. Nur zuvor geladene Inhalte innerhalb der Cache-Grenzen sind verfügbar.

Privates Study benötigt dieselbe zuvor bestätigte, noch gültige Kontositzung im selben Tab. Privates Offline-Neuladen benötigt eine Verbindung; der erste Besuch der Übersicht im bestätigten Tab funktioniert nach der Vorbereitung im Hintergrund. Konto- und Sitzungswechsel, geänderte Einstellungen, Modul-Lebenszyklusänderungen und die Freigabe eines Anbieters verwerfen private Schnappschüsse. Serverseitige Sperren können ohne Verbindung nicht erkannt werden. Die Wiederherstellung prüft ungespeicherte Änderungen und lädt die Serverautorisierung neu.

### Übertragung und Zustimmung

Der Host stellt `offline:outbox`, `offline:state` und `offline:accessPolicy` über ctx bereit. Komponenten registrieren Übertragungshandler für ihre Anbieter-Lebensdauer und stabile IDs über `offline:enqueue`; `offline:flush` autorisiert und überträgt. Die dauerhafte kontogebundene Warteschlange umfasst höchstens 1.000 Einträge und 1 MB für sieben Tage, ohne Tokens. IDs und Zeitstempel bleiben erhalten; temporäre Fehler werden wiederholt, bestätigte oder dauerhaft abgelehnte Einträge entfernt. Eine lokalisierte Warnung meldet Ablehnungen. Abmelden leert die Konto-Warteschlange; andere Konten erhalten keine fremden Einträge. Deaktivieren stoppt neue Offline-Einträge. Vorhandene Einträge können online übertragen werden.

Die Wiederherstellung aktualisiert Anbieter und führt `authenticate-session` aus, bevor die abschließende Phase `afterSession` Aktivitäten überträgt. Erforderliche Anbieter deklarieren `offlineAccessGuard` im Serverkatalog. Unbekannte Anforderungen oder fehlende Zustimmung sperren Offline-Zugriff. Terms of Service speichert zuletzt abgerufene Dokumentversionen und serverbestätigte Zustimmung je Konto. Neue nicht akzeptierte Versionen sperren Offline-Lesen, Navigation und Einträge sofort sowie die Übertragung bis zur Online-Zustimmung. Offline-Zustimmung ist nicht möglich. Private Inhalte bleiben tablokal; nur begrenzte Warteschlangen und Rechtstexte überstehen Neuladen. Die anfängliche Phase `beforeSession` verwirft die bisherige Übertragungsverifikation vor jeder Authentifizierung.

### Leere Offline-Lernseiten

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Offline-Lernressourcen

Study bereitet verzögert benötigte Popup-Symbole, Zeichenvorlage, Zeichenstile und Schließen-Symbole online vor, ohne das Zeichenfeld zu öffnen oder die Anmeldung zu blockieren. Nach Wiederherstellung wird die Vorbereitung wiederholt; mit dem Anbieter wird sie beendet. Bereits zwischengespeicherte Zeichen können das Zeichenfeld erstmals offline öffnen. Inhalte lassen sich offline nicht bearbeiten; ein offenes Detailfenster deaktiviert Bearbeiten bei Verbindungsverlust. Fehlende dekorative Popup-Symbole behalten ihre übersetzte Aktionsbeschriftung, statt einen Ressourcenfehler anzuzeigen.

### Offline-Verfügbarkeit

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Gemeinsame Lernfavoriten

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Offline-Arbeitsbereich

Nach bestätigter Anmeldung bereitet Study Schemas, lesbare Speicherorte, Formulare, Gesehen-Markierungen und ausdrücklich erlaubte leichte Sammlungen für eingeschriebene Lern- und Unterrichtssprachen vor. Flashcards bereitet seine Liste und alle sichtbaren passenden Stapel mit Kartendetails innerhalb des bestehenden begrenzten Caches vor. Änderungen der Einschreibung starten die Vorbereitung erneut. Zwei Worker begrenzen gleichzeitige Lesevorgänge; Provider-Abbau, Kontowechsel, Zugriffsverweigerung und zwischengespeicherte rechtliche Zustimmung bleiben wirksam. Ein vorheriger Seitenbesuch ist nicht erforderlich. Private Schnappschüsse bleiben an den bestätigten Tab und die Sitzung gebunden.

### Offline-Übungen

Die Library-Verwaltung und ihre Bearbeitungs-, Such- und Anfrageseiten benötigen eine Verbindung. Das Study-Untermenü behält diese Links offline bei, deaktiviert sie jedoch auch unmittelbar nach einem Verbindungsabbruch. Explore bleibt zum Lesen gespeicherter Inhalte und zum Zeichnen verfügbar. Der Library-Provider meldet nur Explore als Offline-Sitzungsroute an.

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Sanfte Übergänge und Navigation

Study verwendet bestätigte Sitzungsschnappschüsse sofort und prüft sie gebündelt höchstens alle dreißig Sekunden neu. Neue Metadatenanfragen sind auf fünf Sekunden begrenzt, optionale Wörterbucherkennung auf drei Sekunden. Verbindliche Zugriffsverweigerungen löschen Schnappschüsse; Einschreibungs- und Moduländerungen verwerfen Navigationsdaten, und fehlgeschlagene Unterseitenerkennung kann erneut versucht werden.

### Sichtbare Offline-Ziele

Nicht verfügbare Ziele bleiben in der Hauptnavigation, im Benutzermenü und im Study-Untermenü mit derselben deaktivierten Darstellung sichtbar. Library sowie Verwaltungs- und Anfragelinks bleiben offline aufgeführt, sind aber deaktiviert und werden nach Wiederherstellung der Verbindung wieder aktiv. Die Study-Berechtigungen bestimmen weiterhin, welche Einträge vorhanden sind. Deaktivierte Links laden keine Routen und öffnen keine Wiederherstellungshinweise, auch nicht bei der zustandsgebundenen Sprach- und Einstellungsnavigation von Study. Zwischengespeicherte Explore- und Flashcards-Inhalte bleiben erreichbar.

### Bestätigte Favoriten

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

## Sicherheit

### Study-Authentifizierung beachten

Study benötigt vor der Routenregistrierung das Authentication-Gateway und dessen Fähigkeit `auth:routeContext`. Adapterverwaltung, Sprachermittlung und Zeichenrouten verwenden den eingebundenen Kontext einschließlich eigener Zugriffswächter. Fehlt der Authentifizierungsvertrag, schlägt der Start fehl, statt einen Standardwächter auszuwählen.

### Zugriff auf Dashboard und Study

Das Dashboard deklariert privaten Offline-Zugriff innerhalb der Sitzung; Kontoübersicht und zwischengespeicherte bevorstehende Termine bleiben nutzbar. Beim erneuten Offline-Öffnen werden optionale, vom Server geladene Erweiterungen ausgelassen. Der Study-Anbieter registriert die Übersichtsroute und nutzt über `study:navigation`-Abläufe konto- und sitzungsgebundene Schnappschüsse von Sprachkatalogen, Lernpräferenzen und Modulverweisen. Beim Laden der Navigationsleiste werden diese kleinen Metadaten vorab geladen. Explore und Lernkarten behalten ihre anbietergebundenen Routendeklarationen; nicht unterstützte Seiten nutzen weiterhin die stille Wiederherstellung. Die Auswahl zu lernender Sprachen erfordert eine Verbindung.

## Referenz

### Abdeckung der Referenzverzeichnisse

Der japanische Referenzkatalog umfasst alle 13.108 Zeichen der mitgelieferten offiziellen KANJIDIC2-Daten. Der englische Katalog enthält alle 135.969 lexikalischen Einträge von Open English WordNet mit 127.311 normalisierten Schlüsseln. Es sind eigenständige, bedarfsgeladene Wörterbuchanbieter und keine 149.077 sofort importierten Startkarten. In der Study-Suche das Referenzwörterbuch wählen, um unterstützte Einträge über die normale Graphprüfung zu importieren. Fehlende Bedeutungen und nutzbare Lesungen bleiben unbekannt; Aussprache, Übersetzungen und Strichbilder werden nicht erfunden. Das Verzeichnis umfasst weder alle Unicode-Han-Zeichen noch jedes denkbare englische Wort.

Japanische Kanji-Lesungen werden nach häufigen JMdict-Belegen und verfügbaren Häufigkeitsmarkern einschließlich Okurigana-Formen geordnet. Gruppierte Verweise und Startaufnahmen folgen genau dieser Reihenfolge. Kanji-Audio verwendet immer die erste verfasste Aussprache. Vorhandene englische Wortkarten haben jeweils eine IPA-Lesung; Referenzeinträge bewahren die Quellreihenfolge innerhalb der bevorzugten britischen Varietät vor anderen Varietäten. Aussprachehäufigkeit hängt vom Kontext ab; die Quellen liefern keine allgemeingültige Rangfolge für jede Lesung.

Referenzdateien werden mit `python3 scripts/import-reference.py --source <source-file>` erstellt; Japanisch unterstützt `--priorities <reading-priorities.json>`. `data/reference/manifest.json` enthält Quellprüfsumme, Herkunft, Anzahlen und Datei-Hashes. Nur die Dateien angefragter Schlüssel werden geladen; Laufzeitergebnisse verwenden den Cognis-Cache.

### Vollständige Ausspracheaufnahmen der Referenzdaten

Japanisch enthält zusätzlich 2.913 neuronale Aufnahmen vollständiger Lesungen in begrenzten Dateien unter `data/audio/reference/`. Zusammen mit den Startaufnahmen decken sie die erste Lesung aller 12.356 Quellzeichen mit bekannter Lesung ab; für die übrigen 752 Zeichen werden keine Aussprachen erfunden. Der Index wählt die erste verfasste Lesung und prüft Dateigrenzen und Abbruch. Mit `python3 scripts/reference-audio.py plan --work <directory>` einen Plan erstellen, dessen Verzeichnisse mit dem Syntheseskript verarbeiten und mit `pack` die begrenzten Dateien schreiben.

Das japanische Sortierwerkzeug akzeptiert `--dictionary <JMdict.gz> --kanji-dictionary <KANJIDIC2.xml.gz> --output <priorities.json>` und optional `--content-root data/library/content`. Es bevorzugt häufige eigenständige Wortlesungen, ordnet weitere Lesungen nach häufigkeitsgewichteten Zuordnungen belegter Wörter und erhält geprüfte Einzelkarten-Vorgaben aus `data/audio/primary-readings.json`. Stimmhaftigkeit und Gemination werden auf kanonische Quelllesungen zurückgeführt. Kun-, On- und Namenslesungen bleiben verfügbar; allein die erste ausgewählte Lesung bestimmt Wiedergabe und Cache-Identität. Häufigkeitsmarker dienen der Reihenfolge und sind keine allgemeingültige Aussprachemessung.

Die automatische Zusammensetzung benötigt Aufnahmen für ihre gesprochenen Bestandteile. Fehlende Aufnahmen bleiben ausdrückliche Fehler und lassen sich über das normale Audio-Upload-Feld ergänzen. Nicht mit dem Paketalphabet verknüpfbare Schreibweisen behalten Quelltext und Bedeutungen ohne erfundene Schreibverweise.

### Technische Spezifikation

`{ "entryIds": ["entry-id"] }` → `{ "data": { "entryIds": ["entry-id"], "entries": [{ "id": "entry-id", "label": "..." }] } }`

Fehlende Übersetzungen abrufen verwendet `POST /api/v1/study/library/definitions/localize` mit `{ translations, languages }`. Fehlende UI-Sprachen werden über `localization:translateString` angefordert, vorhandene Übersetzungen bleiben erhalten. Bei fehlenden oder fehlerhaften Anbietern werden `missingLanguages` gemeldet. Fehlende Texte können bearbeitet werden; englische Texte werden nicht in andere Sprachfelder kopiert. Die Aktion steht auch beim manuellen Hinzufügen von Definitionen bereit.

### Technische Spezifikation

Sprachgalerien bestimmen die Sprache aus dem Pfad und filtern sichtbare Decks über den öffentlichen Study-Vertrag. Deckdetails identifizieren Sprache und Deck-UUID; ein Sprachwechsel öffnet die entsprechende Galerie. Flüchtige Abfragedaten werden nicht in Navigations-URLs übernommen.

Study verwendet für adaptereigene Links wie Anfragen die lokalisierten `navigationLabels` aktiver Adapterrouten. Deren Übersetzungsschlüssel werden nicht über das Sprachpaket des Gateways aufgelöst. Die Auswahl erfolgt nach genauer UI-Sprache, Basissprache und anschließend Englisch; Study-eigene Links verwenden weiterhin die XML-Ressourcen des Gateways.

### Technische Spezifikation

| Seite / Bereich                  | Anleitung         | Zugriff             |
| -------------------------------- | ----------------- | ------------------- |
| `/study`                         | Study-Übersicht   | Angemeldeter Nutzer |
| `^/study/(?:settings\|welcome)$` | Lerneinstellungen | Angemeldeter Nutzer |
