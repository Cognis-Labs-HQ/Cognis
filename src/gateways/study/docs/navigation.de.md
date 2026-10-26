# Study-Navigation

Study-Seiten teilen einen Composer-Platz für die Unternavigation, verwenden gemeinsame Navigations- und Aktionsbeschriftungen aus ui.reuse in allen vier Sprachen und bestimmen die aktive Route beim Rendern. Abgebrochene Router-Bereiche bleiben beim Ersetzen abgebrochen. Fehler der Bildvorschau zeigen eine lokalisierte Meldung und geben die Öffnungssperre für einen weiteren Versuch frei.

Der Zeichenfortschritt speichert jede zugestellte Versuchskennung zusammen mit dem Zähler. Ein erneuter Versuch A nach B oder nach einem Neustart erhöht die Schwierigkeit nicht nochmals. Die bestehenden validierten Fortschritts- und Belohnungsintegrationen bleiben aktiv.

Flashcards verwendet `/study/<iso>/flashcards` und `/study/<iso>/flashcards/<deck-id>`. Die Sprachsteuerung öffnet die entsprechende Galerie und übernimmt kein fremdsprachiges Deck. `/study/flashcards` löst die aktuelle Sprache auf. Bibliothek und Anfragen bleiben gemeinsame Seiten.

## Anwendungsbeispiele

Öffnen Sie `/study/ja/flashcards` für japanische Decks; Englisch öffnet `/study/en/flashcards`.

## Technische Spezifikation

Sprachgalerien bestimmen die Sprache aus dem Pfad und filtern sichtbare Decks über den öffentlichen Study-Vertrag. Deckdetails identifizieren Sprache und Deck-UUID; ein Sprachwechsel öffnet die entsprechende Galerie. Flüchtige Abfragedaten werden nicht in Navigations-URLs übernommen.

Study verwendet für adaptereigene Links wie Anfragen die lokalisierten `navigationLabels` aktiver Adapterrouten. Deren Übersetzungsschlüssel werden nicht über das Sprachpaket des Gateways aufgelöst. Die Auswahl erfolgt nach genauer UI-Sprache, Basissprache und anschließend Englisch; Study-eigene Links verwenden weiterhin die XML-Ressourcen des Gateways.

## Einheitliche Zeichenfenster

Schwebende Zeichenfelder öffnen sich in einem großen Rahmen, unabhängig vom Seitenverhältnis des Worts oder Musters. Kartenwechsel erhalten Position und manuelle Größenänderungen; Zeichnungen behalten ihre Proportionen.

## Einheitliche Strichführung

Vor der ersten Eingabe zeigt ein noch nicht abgeschlossenes Muster alle Striche. Danach wird über alle Zeichengrenzen hinweg nur der nächste Strich geführt. Bereits abgeschlossene Muster beginnen mit dem nächsten Strich; ausgeblendete Striche zur Wissensprüfung und die Aufdeckfunktion bleiben erhalten.

## Zeichenfortschritt speichern

Abschluss und Anzahl der auszublendenden Striche werden über den Präferenzspeicher je Konto und Karte gespeichert. Jeder Versuch, jedes Zurücksetzen und jede Wiederholung wählt neue zufällige, unterschiedliche Positionen anhand dieser Anzahl. Ein erfolgreicher Abschluss mit höchstens einem Fehler erhöht die Anzahl um eins, begrenzt auf die aktuelle Strichzahl. Abgeschlossene Muster zeigen nur den nächsten Strich; nicht abgeschlossene Muster zeigen vor der Eingabe das gesamte Muster. Authentifizierte GET- und POST-Anfragen an `/api/v1/study/drawing/:cardId` durchlaufen `study:drawing:readProgress` und `study:drawing:complete`; der Browser übermittelt keine Kontoidentität.

Der letzte akzeptierte Strich speichert sofort den Abschluss und die nächste Schwierigkeit. Das Schließen des Zeichenfelds oder Verlassen von Explore bricht das Speichern nicht ab. Beim erneuten Öffnen derselben Karte und bei Wiederholungen wird vor der Auswahl versteckter Striche auf den gespeicherten Fortschritt gewartet.

## Schreibantworten verbergen

Die Überschrift des Zeichenfelds verbirgt zunächst das Zeichen hinter einer normalen Schaltfläche zum Aufdecken. Ein anderes Zeichen wird erneut verborgen. Schwebende Sitzungen melden ihre aktuelle Karte über die entfernbare Fähigkeit `study:drawing:observe`. Die passende Bibliotheksvorschau bleibt geöffnet, unscharf und nicht bedienbar, bis das Feld ein anderes Zeichen lädt oder geschlossen wird; Lesung und Bedeutung bleiben im Zeichenfeld verfügbar. Eingebettetes Schreiben nutzt dieselbe Verdeckung und meldet Aufdecken als unterstützten Versuch.

## Gespeicherte Lernsteuerung

Die Wörterbuchauswahl verwendet theme-select und wird bei einem einzigen Anbieter ausgeblendet. Einstellungen steht rechts neben der Wörterbuchsuche. KANJIDIC2 ergänzt Kanji-Daten und ist keine Suchoption neben Jisho; Referenzquellen zeigen ihren tatsächlichen Katalognamen.

Lesen/Schreiben ist eine gespeicherte Kontoeinstellung im schwebenden Composer-Menü; Standard ist Lesen. Ein Wechsel während der Übung zeigt vor dem Neustart den gemeinsamen Warndialog. Abbrechen behält Position und Antworten; bereits übermittelte Bewertungen bleiben gespeichert. Die Seitenleiste enthält Alle und markiert den aktuellen Stapel. Schreibüberschriften verwischen ein gleich großes maskiertes Zeichen. Der erste Klick deckt es auf und aktiviert den Explore-Direktlink; ein zweiter Klick bietet die Navigation mit Bestätigung an. Die Tastaturbedienung folgt demselben Ablauf.

## Navigation im Schreibfenster

Das Öffnen des Schreibfensters aus den Kartendetails schließt die Detailansicht nach erfolgreichem Öffnen. Der verdeckte Titel wird weiterhin beim ersten Klick sichtbar. Auf Explore öffnet ein weiterer Klick die Karte direkt; auf anderen Study-Seiten bleibt die Bestätigung vor dem Wechsel zu Explore erhalten.

Antwortmöglichkeiten in Lernkarten sind eigenständige Antwortschaltflächen. Kartenüberschriften und aufgedeckte Antworten verwenden interne Aktionen mit Bestätigung beim Verlassen und erhaltener Stapelreihenfolge, ohne Kartenadressen beim Überfahren anzuzeigen. In Explore öffnet ein zweiter Klick auf die aufgedeckte Zeichenüberschrift die Karte direkt über eine Aktion ohne Adresse.

Schreibübungen verwenden nur die maskierte Überschrift des Zeichenfelds. SVG-Pfeile für Zurück/Weiter stehen darüber neben dem Favoriten; Weiter erfordert weiterhin eine Antwort. Flashcards übergibt `suppressRetry: true` an das gemeinsame Zeichenfeld und blendet Wiederholen aus und deaktiviert es; eigenständige Übungen erlauben Wiederholen standardmäßig.

Eingebettete Verbraucher können nach der gemeinsamen Bestätigung `onNavigate(card)` bereitstellen. Flashcards verbucht damit den aktuellen Versuch über den Ablauf zum Verlassen und erhält den Stapelkontext vor dem Öffnen von Explore.

## Erweiterbare Browseraktionen

Library-Browserclients lösen `study:library:client` über ctx auf. Der Anbieter registriert `study:library:<clientFunction>` mit `before`, `execute` und `after` für Lesezugriffe, Wörterbuchaktionen, Anfragen, Importe und Medien. Erforderliche Routenfähigkeiten laden den Anbieter vor dem Einhängen. Erweiterungsargumente, Ablehnung und Lebenszyklus sind in der Dokumentation des Library-Adapters beschrieben.

## Study-Authentifizierung beachten

Study benötigt vor der Routenregistrierung das Authentication-Gateway und dessen Fähigkeit `auth:routeContext`. Adapterverwaltung, Sprachermittlung und Zeichenrouten verwenden den eingebundenen Kontext einschließlich eigener Zugriffswächter. Fehlt der Authentifizierungsvertrag, schlägt der Start fehl, statt einen Standardwächter auszuwählen.

## Gleichmäßige Übungsauswahl

Zeichenhilfen und das Mischen von Karteikartenantworten verwenden gemeinsam `randomIndex`. Die Funktion nutzt Web Crypto mit maskierter Verwerfungsauswahl für ganzzahlige Bereiche von 1 bis 2^32 ohne Modulo-Verzerrung. Ein Bereich mit einer einzigen Position benötigt keine Entropie. Für deterministische Tests kann eine Entropiequelle übergeben werden; normale Übungen verwenden immer Web Crypto.

## Komponentengrenzen und Laufzeit

Die API delegiert Erweiterungsnamensräume über Richtlinien aktiver Gateways; Study besitzt die Regeln für Sprachnamensräume. Library entfernt seine öffentlichen Funktionen, wenn der Adapter oder seine Study-Abhängigkeiten deaktiviert sind, weist gespeicherte Funktionsreferenzen zurück und registriert sie beim Aktivieren erneut. Study-Adapter verwenden `onAvailabilityChange(listener)` für laufzeitgebundene Beiträge; ein fehlgeschlagener Start entfernt diese.

## Offline lernen

Der Offline-Modus ist in den Einstellungen standardmäßig aktiviert. Deaktivieren stellt die bisherigen Verbindungswarnungen und Fehlermeldungen wieder her und schaltet den Worker-Fallback ab. Bei Aktivierung wechselt die Anwendung bei Verbindungsverlust ohne Fehlermeldung in den Offline-Modus; nicht verfügbare Navigation wird ohne Fehlerdialog blockiert.

Study behält begrenzte, kleine JSON-Schnappschüsse im aktuellen Tab: Schemas, erlaubte Zeichen- und Kartendaten, Speicherorte, gesehene IDs, Favoriten und zuvor geöffnete Kartensätze. Sprachschemas aktivieren dies mit `metadata.offline: { cache: "lightweight" }`. Der Library-Cache umfasst höchstens 16 MB und 100 Lesevorgänge; andere Lesecaches höchstens 4 MB und 100 Lesevorgänge. Audiodaten, Wörterbuchantworten, Zugangsdaten und authentifizierte Dokumente werden nicht dauerhaft gespeichert.

Explore-Vorschauen verwenden bereits autorisierte Cache-Daten. Zeichnen und Lernkarten funktionieren lokal. Abschlüsse, Bewertungen, gesehene IDs und endgültige Favoritenzustände werden zur Übertragung vorgemerkt; Fortschritt, XP und Belohnungen sind erst nach Serverbestätigung verbindlich. Audio sowie Wörterbuch- und ElevenLabs-Abfragen stoppen. Bearbeiten, Löschen und Freigaben benötigen eine Verbindung. Nur zuvor geladene Inhalte innerhalb der Cache-Grenzen sind verfügbar.

Privates Study benötigt dieselbe zuvor bestätigte, noch gültige Kontositzung im selben Tab. Privates Offline-Neuladen benötigt eine Verbindung; der erste Besuch der Übersicht im bestätigten Tab funktioniert nach der Vorbereitung im Hintergrund. Konto- und Sitzungswechsel, geänderte Einstellungen, Modul-Lebenszyklusänderungen und die Freigabe eines Anbieters verwerfen private Schnappschüsse. Serverseitige Sperren können ohne Verbindung nicht erkannt werden. Die Wiederherstellung prüft ungespeicherte Änderungen und lädt die Serverautorisierung neu.

## Übertragung und Zustimmung

Der Host stellt `offline:outbox`, `offline:state` und `offline:accessPolicy` über ctx bereit. Komponenten registrieren Übertragungshandler für ihre Anbieter-Lebensdauer und stabile IDs über `offline:enqueue`; `offline:flush` autorisiert und überträgt. Die dauerhafte kontogebundene Warteschlange umfasst höchstens 1.000 Einträge und 1 MB für sieben Tage, ohne Tokens. IDs und Zeitstempel bleiben erhalten; temporäre Fehler werden wiederholt, bestätigte oder dauerhaft abgelehnte Einträge entfernt. Eine lokalisierte Warnung meldet Ablehnungen. Abmelden leert die Konto-Warteschlange; andere Konten erhalten keine fremden Einträge. Deaktivieren stoppt neue Offline-Einträge. Vorhandene Einträge können online übertragen werden.

Die Wiederherstellung aktualisiert Anbieter und führt `authenticate-session` aus, bevor die abschließende Phase `afterSession` Aktivitäten überträgt. Erforderliche Anbieter deklarieren `offlineAccessGuard` im Serverkatalog. Unbekannte Anforderungen oder fehlende Zustimmung sperren Offline-Zugriff. Terms of Service speichert zuletzt abgerufene Dokumentversionen und serverbestätigte Zustimmung je Konto. Neue nicht akzeptierte Versionen sperren Offline-Lesen, Navigation und Einträge sofort sowie die Übertragung bis zur Online-Zustimmung. Offline-Zustimmung ist nicht möglich. Private Inhalte bleiben tablokal; nur begrenzte Warteschlangen und Rechtstexte überstehen Neuladen. Die anfängliche Phase `beforeSession` verwirft die bisherige Übertragungsverifikation vor jeder Authentifizierung.

## Zugriff auf Dashboard und Study

Das Dashboard deklariert privaten Offline-Zugriff innerhalb der Sitzung; Kontoübersicht und zwischengespeicherte bevorstehende Termine bleiben nutzbar. Beim erneuten Offline-Öffnen werden optionale, vom Server geladene Erweiterungen ausgelassen. Der Study-Anbieter registriert die Übersichtsroute und nutzt über `study:navigation`-Abläufe konto- und sitzungsgebundene Schnappschüsse von Sprachkatalogen, Lernpräferenzen und Modulverweisen. Beim Laden der Navigationsleiste werden diese kleinen Metadaten vorab geladen. Explore und Lernkarten behalten ihre anbietergebundenen Routendeklarationen; nicht unterstützte Seiten nutzen weiterhin die stille Wiederherstellung. Die Auswahl zu lernender Sprachen erfordert eine Verbindung.

## Leere Offline-Lernseiten

Vorbereitete Study-Seiten bleiben in einer bestätigten Offline-Sitzung mit gültiger Zustimmung auch ohne private Inhalte erreichbar. Fehlende Sprach- und Präferenzdaten ergeben eine leere Navigation. Explore zeigt seine normale leere Ansicht und den gezielten Hinweis „Keine offline gespeicherten Inhalte verfügbar“ statt einer nicht verfügbaren Route oder Fehlermeldungen. Flashcards behält eine leere Seite, wenn Kartendaten oder notwendige Ansichtsressourcen fehlen. Hinweise sind an die Seite gebunden und werden nicht doppelt angezeigt. Cache-Fehler verbergen keine Zugriffs- oder Zustimmungsverweigerung. Library und Flashcards bereiten öffentliche Übersetzungen und kleine Vorlagen online vor; private Daten bleiben in begrenzten tablokalen Caches.

## Offline-Lernressourcen

Study bereitet verzögert benötigte Popup-Symbole, Zeichenvorlage, Zeichenstile und Schließen-Symbole online vor, ohne das Zeichenfeld zu öffnen oder die Anmeldung zu blockieren. Nach Wiederherstellung wird die Vorbereitung wiederholt; mit dem Anbieter wird sie beendet. Bereits zwischengespeicherte Zeichen können das Zeichenfeld erstmals offline öffnen. Inhalte lassen sich offline nicht bearbeiten; ein offenes Detailfenster deaktiviert Bearbeiten bei Verbindungsverlust. Fehlende dekorative Popup-Symbole behalten ihre übersetzte Aktionsbeschriftung, statt einen Ressourcenfehler anzuzeigen.

## Offline-Verfügbarkeit

Die Offline-Routenregistrierung bleibt bei wiederholten gebündelten und direkt ausgelieferten Importen erhalten. Vorbereitete Routen behalten ihre Verfügbarkeit bei neu erzeugten Beschreibungen mit denselben Skripten, Stilen und Funktionsanbietern; geänderte Assets müssen erneut vorbereitet werden. Nachrichten bereitet Chatlisten, Übersetzungen und Emoji-Kataloge nach bestätigter Anmeldung vor. Die Seite kann vor dem ersten Online-Besuch offline geöffnet werden. Automatisch öffnen nur zwischengespeicherte Chats mit zwischengespeichertem Verlauf; ein nicht gespeicherter Verlauf zeigt einen gezielten Informationstoast. Explore behält verfügbare Sammlungen, wenn eine andere Sammlung oder der Gelesen-Status fehlt. Zugriffs- und Einwilligungsverweigerungen werden weiterhin weitergegeben. Banneraktionen stehen direkt in der gemeinsamen Aktionszeile und verlieren den geerbten vertikalen Versatz.

## Gemeinsame Lernfavoriten

Der Study-Anbieter stellt `study:favourites` mit lebenszyklusgebundenen Operationen `load`, `toggle` und `has` bereit. Darstellungsfunktionen verwenden diese ctx-Funktion statt eines eigenen Caches pro Lader. Favoriten werden nach bestätigter Anmeldung vorbereitet, berücksichtigen vorgemerkte Änderungen und teilen konto- und sitzungsgebundenen Zustand zwischen Explore, Lernkarten und wiederholten Importen. Fehlt ein optionaler Favoriten-Snapshot, bleibt die Auswahl mit vorgemerkten Änderungen nutzbar; Inhalte werden nicht verborgen und kein Aktualisierungsfehler angezeigt. Ein Kontowechsel leert die sichtbare Auswahl. Zugriffsverweigerungen gelten niemals als Cache-Fehltreffer.
