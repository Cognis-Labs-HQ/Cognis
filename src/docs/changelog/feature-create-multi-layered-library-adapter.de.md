# Einheitliche Bibliothek

**Feature-Zweig:** feature-create-multi-layered-library-adapter

## Nachverfolgbare Ebenen

Ein Study-Bibliotheksadapter ergänzt unveränderliche Ebenen für Schriftsysteme, Definitionen, Sprachmaterial, Übungen, Trainingseinheiten, Routinen und Sammlungen. Gerichtete Verweise verbinden jedes Material mit seinen Bausteinen.

## Sichere Bereiche

Globale, klassenbezogene und private Benutzerbereiche besitzen rollen- und mitgliedschaftsabhängige Zugriffsregeln. Veröffentlichungsanfragen erfordern die Freigabe am Ziel und übernehmen alle referenzierten Abhängigkeiten gemeinsam.

## Import, Export und Oberfläche

Die Bibliothek ist über ctx und authentifizierte APIs verfügbar, einschließlich validiertem globalem JSON-Import, JSON- und Anki-Export, Unicode-Wortzerlegung, Tiefenverfolgung und einer Study-Seite für alle Benutzer.

## Auswählbare Vorlagen

Sprach- und Aktivitätsmodule können nur die benötigten Ebenen der kanonischen Vorlage kopieren. Ebenenbezogene Metadaten erhalten gültige Beziehungen, kennzeichnen Pflichtabhängigkeiten und leiten Verknüpfungen von Zeichen zu Wörtern sowie von Wörtern zu Sätzen ab.

## Neugestaltung des Beziehungsframeworks festlegen

Ein stufenweiser Implementierungsplan ersetzt feste Bibliotheksschichten durch verbrauchereigene Schemata, geprüfte generische Beziehungen, austauschbare Auflösungs- und Lookup-Flows, vollständige Detailansichten, Deep Links und eine rücksetzbare Migration.

## Neugestaltung umsetzen

Feste Ebenen wurden durch gespeicherte, versionierte Verbraucherschemata ersetzt. Typisierte Felder, Kardinalität, geordnete Kanten, Schemaversionen und sichtbare Beziehungsziele werden geprüft. Unicode-Graphemauflösung und entfernbare Lookup-Anbieter mit Herkunft wurden ergänzt.

## Beziehungen vollständig durchsuchen

Neutrale Schema-, Detail-, Trace-, Auflösungs- und Lookup-APIs sowie eine schemagesteuerte Oberfläche zeigen beliebige Ebenen, Felder, Bestandteile und eingehende Verwendungen unter dauerhaft ladbaren Detailadressen.

## Inkompatible Capability-Änderung

Die inkompatible Schemafähigkeit wurde mit Adapter 2.0.0 eingeführt; die deklarative Paketübernahme erhöht ihn auf 2.1.0. Verbraucher registrieren ein Schema und verwenden dessen Schema- und Beziehungs-IDs anstelle des entfernten festen Katalogs, der Vorlagenklone und schichtspezifischen Import- und Exportmethoden.

## Deklarative Sprachpakete ergänzen

Sprachpakete können nun ein reines Datenverzeichnis zur deterministischen Prüfung und atomaren Übernahme an die Bibliotheksfähigkeit übergeben. Cognis prüft sichere Pfade, Manifest, Lizenz, Schema, alle Datensätze und Beziehungen, erzeugt stabile Namensraum-IDs und speichert versionierte Installationsbelege. Das Sprachframework beschreibt Manifest, Schema, Ebenenverzeichnisse, Datendateien und die Trennung zu ausführbaren Resolver- und Lookup-Adaptern.

## Lokalisierte Definitionsdatensätze

Definitionsebenen deklarieren jetzt moduleigene Zuordnungen von Zeichenkettenschlüsseln. Das Erstellungsformular der Bibliothek fragt alle Cognis-Oberflächensprachen ab, verlangt nur Englisch, erzeugt einen stabilen Schlüssel zur ID des Definitionseintrags und bietet eine optionale ctx-Übersetzungsfähigkeit für zukünftige Anbieter.

## Bibliotheksansicht ausbauen

Die Bibliothek verwendet jetzt Ebenen-Reiter, kartenbasierte Einträge und wiederverwendbare Pop-up-Details. Die Auswahl von Einträgen und das Navigieren durch Beziehungen erfolgen im Hintergrund, ohne Datensatzkennungen in der Browser-URL anzuzeigen. Die gleich breiten Zurück- und Weiter-Steuerelemente verwenden eindeutige Richtungspfeile. Außerdem bietet die Studien-Unternavigation allen Steuerelementen genügend Platz, statt sie beim Darüberfahren abzuschneiden.

## Unterstützende Inhalte integrieren

Definitionen und Partikel bleiben jetzt aus der direkten Bibliotheksansicht ausgeblendet. Eintragsdetails zeigen lokalisierte Definitionen unter der Überschrift, beziehen Satzpartikel als schreibgeschützte Beziehungsdetails ein, stellen Badge-Metadaten als Pills dar, kennzeichnen den Bereich mit zugänglichen SVG-Symbolen und bieten jedes Badge-Feld als Kartenfilter an.

## Bibliotheksfilter und Details verfeinern

Metadaten-Auswahlfelder der Bibliothek verwenden jetzt die gemeinsame Theme-Gestaltung und wenden Änderungen sofort an. Detail-Pop-ups nutzen größere Überschriften, zeigen Definitionen und Bedeutungen unter dem Titel und stellen erkannte Bestandteile als navigierbare Unterfelder in der Überschrift statt in einem separaten Komponentenabschnitt dar.

## Pill-Filter und gemeinsames Audio

Metadaten-Auswahlfelder wurden durch optional gruppierte Filter-Pills ersetzt, und die Studiennavigation trennt wieder linke Seiten von rechten Sprachsteuerungen. Schemata für Schreibeinheiten verlangen jetzt Aussprache und Audio; Module können lokale Audiodateien oder HTTPS-Quellen liefern, die Cognis einmal in einen zugriffsgeschützten gemeinsamen lokalen Zwischenspeicher lädt.

## Laden und Gateway-Speicherung wiederherstellen

Die Bibliothek wird wieder in Browsern ohne natives `Map.groupBy` dargestellt. Normalisierte Studien-Sprachcodes erhalten registrierte Flaggen an den Sprachsteuerungen, und entferntes Audio wird vollständig in einem komponenteneigenen Namensraum des Datei-Gateways gespeichert. Die Bibliothek schreibt keine Cache-Dateien mehr direkt und setzt keine eigene Größenobergrenze für Audio.

## Mit dem upstream Development-Zweig abgleichen

Die neuesten Änderungen aus dem upstream Development-Zweig wurden zusammengeführt. Der eingestellte Registrierungseinladungs-Adapter wurde zugunsten der upstream tokenbasierten Implementierung aufgelöst, damit die Studienbibliothek mit der aktuellen Anwendungsarchitektur kompatibel bleibt.

## Kompatibilität der Studienadapter aktualisieren

Die getestete Gateway-Obergrenze der Bibliotheks- und Fortschrittsadapter wurde auf die upstream Gateway-Version angehoben, beide Adapterversionen wurden erhöht und ihre vollständigen Workspace-Einträge in der Sperrdatei wurden wiederhergestellt, damit eine saubere Abhängigkeitsinstallation nach der Zusammenführung gelingt. Korrigierte upstream Integritätsmetadaten der Paketregistrierung machen den gesperrten Abhängigkeitssatz zudem reproduzierbar.

## Änderungen auf die Bibliothek begrenzen

Nicht zusammenhängende Änderungen an Kern, API, Router, Adaptern, Gateways und Funktionen wurden entfernt. Dieser Pull Request enthält damit nur die Studienbibliothek, ihre Studienintegration und die dafür erforderlichen wiederverwendbaren UI-Werkzeuge.

## Gruppierte Study-Unterseiten routen

Eine generische UI-Fähigkeit für gruppierte Unterseitenerkennung, Zwischenspeicherung, Invalidierung und Routenauflösung wurde hinzugefügt. Study verwendet nun ein einziges anbietergestütztes Modell für die Seitenliste jeder Sprache, die Unternavigation der ausgewählten Sprache, Hub-Karten und das Laden untergeordneter Seiten. Die Navigation bewahrt die ausgewählte Sprache im privaten Verlaufstatus.

## Interaktionen der Bibliothek verfeinern

Das Einklappen der Kopfzeile beim Scrollen wurde stabilisiert, die Study-Ebenennavigation wird beim ersten Laden gefüllt, Überlauf an Sprachschaltflächen wurde entfernt und kompakte Pop-up-Überschriften wurden wiederhergestellt. Die administrative Bibliothek öffnet nun schreibgeschützte Zeilendetails mit vereinfachter Referenzübersicht und Mehrfachauswahl per Rechtsklick. Lernkarten zeigen wieder Aussprachen und Definitionen in der Vorschau, behalten tiefe Verknüpfungen und vermeiden doppelte Detailabschnitte. Aktiver Ebenenstatus, zentrierte Auswahlmarken und themengerechte Bearbeitungssteuerungen bleiben visuell konsistent.

## Vom Anbieter gesteuerte Library-Bearbeitung

Library-Zeilen öffnen schreibgeschützte Details über ihre gesamte Trefferfläche, während themenabhängige Bearbeitungsaktionen am Zeilenende bleiben. Anbieter-Schemata steuern Feldbezeichnungen, Steuerelemente, unveränderliche Klassifizierungen, Deep-Link-Beziehungen und die sprachgebundene Audiosuche. Tags werden mit der Eingabetaste übernommen, ausgewählte Optionen lassen sich abwählen, Pflichtfelder werden vor dem Senden geprüft und schwebende Aktionen sind lokalisiert. Karten und die Study-Unternavigation verwenden stabile, themengerechte Hover-Zustände; Zusammensetzungen wählen vor atomaren Zeichen die nächstgelegenen übergeordneten Datensätze.

## Library-Vorschauen und Administratorprüfung verfeinern

Lernkarten zeigen jetzt eine schlanke einzeilige Kombination aus Bezeichnung und Aussprache mit getrenntem Bereichssymbol; Definitionen und Metadaten wurden aus der Vorschau entfernt. Ein Klick auf eine Administratorzeile öffnet nun dasselbe schemagesteuerte Formular wie die Bearbeitung, jedoch deaktiviert und schreibgeschützt, statt das Detailfenster für Lernende zu öffnen.

## Kompakte Karten und Vokabellinks präzisieren

Die Flächen der Lernkarten wurden abgedunkelt, Variantenhinweise erhalten eine kompakte, nicht verdeckende Ecke und redundante Hover-Einblendungen für Beziehungen wurden entfernt. Vokabelbeziehungen enthalten nun die vom Anbieter gelieferte Aussprache, damit bedeutungsvolle Ein-Zeichen-Wörter von ihren Schriftzeichen-Datensätzen unterscheidbar bleiben.

## Verschachtelte Variantenäste sichtbar halten

Library-Raster behalten ihre Begrenzung. Geöffnete Äste prüfen nun die vom Anbieter bevorzugten und alternative Richtungen gegen die gerenderten Grenzen, damit verschachtelte Karten im Kartenraster bleiben. Der Hinweis zum Gedrückthalten wird nicht mehr animiert oder unscharf und seine Schrift ist 25 % größer.

## Vom Anbieter bevorzugte Variantenplatzierung begrenzen

Das Überlaufen wurde durch eine begrenzte Laufzeitplatzierung ersetzt. Anbieterrichtungen bleiben die erste Wahl, aber jeder sichtbare verschachtelte Ast wird gemessen und bei Bedarf umgeleitet, sodass jede Karte innerhalb des Library-Rasters und Widgets bleibt.

## Anker verschachtelter Karten stabil halten

Die Einpassung misst jetzt nur die jeweils platzierte Karte, sodass ein Nachfahre seine bereits positionierte Elternkarte nicht verschieben kann. Wenn der bereinigte Pfad zu wenige umliegende Plätze bietet, verwenden Geschwisterkarten eine Richtung mit zunehmendem Abstand erneut und werden in derselben Zeile oder Spalte gestapelt.

## Doppelte Vokabel-Titeldetails entfernen

Vokabel-Popups verwenden den Haupttitel jetzt ausschließlich für die Bezeichnung der lexikalischen Einheit und zeigen im Titeldetail nur deren für die aktive Sprache lokalisierte Definition. Alternative Schreibweisen, Aussprachen und Varianten-Elternhinweise duplizieren die Vokabelüberschrift nicht mehr.

## Kontextbezogene Vokabeldefinitionen übernehmen

Beim Öffnen einer Vokabel über eine verwandte Karte wird deren lokalisierte Definition jetzt als Rückfallwert übernommen. Die eigene Definition des Vokabeleintrags bleibt maßgeblich; andere Popup-Navigationen löschen den Rückfallwert, damit Bedeutungen nicht zwischen Navigationspfaden übertragen werden.

## Mehrere geordnete Definitionen darstellen

Karten bewahren jetzt die Definitionsreihenfolge des Anbieters: Die erste lokalisierte Definition wird neben dem Titel hervorgehoben, sofern sie diesen nicht dupliziert; weitere Definitionen erscheinen nur bei vorhandenem Inhalt im Abschnitt „Zusätzliche Definitionen“. Ein Rückfallwert der Ausgangskarte wird nur verwendet, wenn die Vokabel keine Definition bereitstellt.

## Geschwister-Kindkarten in getrennten Plätzen halten

Die Laufzeiteinpassung verfolgt nun die Stammkarte und jedes bereits positionierte sichtbare Kind als belegte Rechtecke. Freie, vom Anbieter bevorzugte Positionen innerhalb der Grenze bleiben erhalten; andernfalls wird die begrenzte Alternative mit der geringsten Überlappung gewählt, sodass Geschwister nicht mehr auf denselben Platz fallen.

## Zuverlässigkeit und Isolation

Paketressourcen verwenden study_library_asset_chunks mit einer SHA-256-Kennung aus Herausgeber, Paket, Version und vollständigem Ressourcenpfad sowie einer ganzzahligen Position. Öffentliche Ressourcen-URLs und Originalbytes bleiben erhalten. Ein Paketindex begrenzt das Entfernen. Schemas behalten ihre Schema-/Versionskennung und verwenden ein Basisfragment mit study_library_schema_parts. Beide Inhalte verwenden Unicode-sichere Fragmente mit höchstens 60.000 UTF-8-Bytes. Lesezugriffe setzen Fragmente geordnet zusammen; der Import ersetzt sie in seiner bestehenden Transaktion. Versionskonflikte, Ersetzen durch den alleinigen Herausgeber, Zurückrollen und kürzere Ersetzungen behalten ihre Semantik.

JSON-Änderungen der Bibliothek akzeptieren höchstens 5 MiB und weisen größere Datenströme vor einer Änderung mit HTTP 413 zurück. Kartenfeld-JSON und seine normalisierte Suchform haben jeweils ein Budget von 50.000 UTF-8-Bytes; dadurch bleibt Platz für Titel und Tags im Suchtext. Audioanhänge benötigen einen exakten Uploadpfad; Pfadwechsel und verschachtelte Pfade werden vor dem Speicherzugriff abgewiesen. Erstellen und Bearbeiten verwenden denselben kanonischen Referenzschreiber für Gruppen, Positionen und gewählte Transformationen. Fehler beim Laden der Speicherorte erscheinen als lokalisierte Meldung; Antworten abgebrochener Seiten aktualisieren keine aktuellen Bedienelemente.

Belohnungszustände behalten die Revisionsprüfung pro Teilnehmer und verwenden ein Basisfragment mit engagement_participant_parts. Ein Commit prüft und erhöht die Revision und ersetzt sämtliche Fragmente in einer Transaktion. Ein einzelner verbundener Lesezugriff liest Basis und geordnete Fragmente, sodass Revision und Inhalt nicht aus verschiedenen Commits stammen können. Jedes Fragment umfasst höchstens 60.000 UTF-8-Bytes. Fehler rollen Revision und Bytes zurück; konkurrierende Schreibvorgänge erhalten engagement_state_conflict. Tests erzwingen das physische Textbudget statt unbegrenzter Zeichenfolgen.

Gemeinsame Typen für Fortschrittsereignisse, Akteure, Projektionen und Fähigkeiten liegen in gateways/study/reuse/progress.ts. Das Gateway importiert dafür keinen optionalen Adapter-Einstiegspunkt mehr; der Adapter implementiert dieselbe Fähigkeit und behält seine öffentlichen Exporte. JSON für Ereignisse und Korrekturen ist auf 60.000 Bytes begrenzt; größere Anfragen liefern vor der Aufzeichnung 413. Datenschutz, Klassenprüfungen, Korrekturen, Belohnungen und Neuaufbau bleiben aktiv.

Nicht authentifizierte Anfragen für Definitionen und Ranglisten rufen die injizierte Authentifizierungsprüfung auf und enden vor dem Datenzugriff mit HTTP 401. Routenparameter verwenden die bestehenden typisierten HTTP- und Berechtigungsverträge.

Bewertungsanfragen akzeptieren höchstens 16 KiB JSON, Deckänderungen höchstens 5 MiB. Größere Anfragen liefern HTTP 413 ohne Änderung an Deck oder Lernplan. Lesen, Schreiben, Wiederholungslisten, importierte Notizen und Bibliothekskarten behalten ihr Verhalten.

PUT-Anfragen für Tresore verwenden den gemeinsamen JSON-Datenstromleser der API mit dem wirksamen Tresorbudget und 1 KiB zusätzlichem Platz für den Umschlag. Richtlinie, 413-Fehler und Prüfung der serialisierten Daten bleiben im Adapter; eine zweite Pufferimplementierung entfällt.

Study-Seiten teilen einen Composer-Platz für die Unternavigation, verwenden gemeinsame Navigations- und Aktionsbeschriftungen aus ui.reuse in allen vier Sprachen und bestimmen die aktive Route beim Rendern. Abgebrochene Router-Bereiche bleiben beim Ersetzen abgebrochen. Fehler der Bildvorschau zeigen eine lokalisierte Meldung und geben die Öffnungssperre für einen weiteren Versuch frei.

## Begrenzte Deckdokumente

Deckzugehörigkeit, importierte Notizen und Lernpläne verwenden Unicode-sichere Fragmente mit höchstens 60.000 UTF-8-Bytes. Eine verknüpfte Abfrage setzt jedes bestätigte Dokument zusammen; Ersetzen und Löschen erfolgen in der Decktransaktion. Upserts der Lernendenzeile serialisieren Wiederholungen und Deckänderungen vor Snapshot-Lesezugriffen, auch bei Repeatable Read. Versuchsbelege werden mit dem Lernplan bestätigt; die Progress-Zustellung bleibt außerhalb dieser Transaktion. Antworten und Exporte lösen Karten und Schemas anhand aktueller Library-IDs auf; Speichern dupliziert keine Library-Karteninhalte.

## Erweiterbare Browseraktionen

Der Library-Anbieter veröffentlicht `study:library:client` über seinen lebenszyklusgebundenen ctx. Jede Gateway-Clientoperation führt `study:library:<clientFunction>` mit `before`, `execute` und `after` aus. Eine Erweiterung von `study:library:createLibraryEntry` bei `before` kann `input.args` (die Positionsargumente der Clientfunktion) prüfen oder ändern beziehungsweise vor der Anfrage einen Fehler zum Ablehnen auslösen. `after` erhält `data.result` und kann den Rückgabewert anpassen. Serverseitige Berechtigungsprüfung und Validierung gelten weiterhin. Lesen, Wörterbuchauflösung, Import, Veröffentlichungsanfragen und Medienänderungen verwenden dieselbe Grenze. Beim Entfernen werden laufende Anfragen abgebrochen und Fähigkeiten, Abläufe und Hooks entfernt; veraltete Aufrufe werden abgewiesen. Erneutes Aktivieren registriert neue Aktionen.

## Benachrichtigungen einmal dekodieren

Anfragebenachrichtigungen dekodieren XML-Entitäten in einem Durchlauf und setzen Konto- und Anfragewerte einmal als unveränderte Daten ein. Kodierte Entitätstexte bleiben auf der nächsten Ebene kodiert. Leere oder fehlende Texte der bevorzugten Sprache verwenden den englischen Wert; fehlt auch dieser, wird ein Fehler ausgelöst. Die vier Ressourcenkataloge werden für die Lebensdauer des Benachrichtigungsdienstes zwischengespeichert; fehlgeschlagene Lesezugriffe können erneut versucht werden.

## Study-Authentifizierung beachten

Study benötigt vor der Routenregistrierung das Authentication-Gateway und dessen Fähigkeit `auth:routeContext`. Adapterverwaltung, Sprachermittlung und Zeichenrouten verwenden den eingebundenen Kontext einschließlich eigener Zugriffswächter. Fehlt der Authentifizierungsvertrag, schlägt der Start fehl, statt einen Standardwächter auszuwählen.

## Gleichmäßige Übungsauswahl

Zeichenhilfen und das Mischen von Karteikartenantworten verwenden gemeinsam `randomIndex`. Die Funktion nutzt Web Crypto mit maskierter Verwerfungsauswahl für ganzzahlige Bereiche von 1 bis 2^32 ohne Modulo-Verzerrung. Ein Bereich mit einer einzigen Position benötigt keine Entropie. Für deterministische Tests kann eine Entropiequelle übergeben werden; normale Übungen verwenden immer Web Crypto.

## Testkonfiguration bleibt Daten

Study-Erkennungstests kopieren statische Adaptermodule und speichern konfigurierbare Kennungen und Abhängigkeiten in JSON. Aus serialisierten Werten wird kein ausführbarer Quelltext erzeugt. Gemeinsame Einrichtung erhält die tatsächliche Erkennung und den Startablauf. Tests für Marktplatzgrafiken vergleichen geparste URL-Ursprünge und Pfade exakt, einschließlich privater GitHub-Anfragen.

## Satzformen auswählen

Wiederholte Verben, Adverbien und Einträge mit Pluralformen öffnen vor dem Einfügen die Formauswahl. Abbrechen erhält die Satzkomposition. Schlüsselbundaktivitäten sind begrenzt, ohne Geheimnisse zu löschen; bestehende Tresore bleiben innerhalb der festen Grenze zur Kürzung lesbar. Fehler der Hintergrundsynchronisierung werden angezeigt.

## Generierte Wortformen

Jeder Formensatz deklariert ein erforderliches `flag`, etwa `transform:verb` oder `transform:plural`, neben seinen grammatischen `matchTags`. Nur entsprechend markierte Basiskarten aktivieren die Gruppe. Unbekannte oder wirkungslose Flags scheitern an der Validierung. Formen sind schreibgeschützte Ansichten mit der kanonischen Basis-UUID und `{setId, path}`; eigenständige Formenkarten dürfen weder erstellt noch importiert oder ausgeliefert werden. Echte Homografen mit anderer grammatischer Klasse bleiben zulässig.

Regeln verändern Schreibweise und Aussprache durch Entfernen und Anfügen von Suffixen, optionale Präfixoperationen, geordnete `suffixes`-Alternativen und lemmaabhängige `forms` für unregelmäßige Grammatik. Überschreibungen ersetzen die allgemeine Textoperation. Pfade verbinden mehrere Zustände einschließlich mehrteiliger Formen; wachsende Zyklen scheitern. Definitionstemplates werden einmal interpoliert, eingesetzter Text bleibt unverändert.

Detailansichten, Satzprüfung und Audio nutzen denselben Resolver. Generierte Ansichten behalten Referenzbilder, entfernen jedoch die Audio- und Strichfelder der Basis. Die Audiosuche verwendet generierte Schreibweise und Hauptaussprache; eine Neugenerierung verändert die Basiskarte nicht. Zeichenübungen setzen die generierte Schreibweise aus Schreibmustern zusammen, behalten Strichgruppen bei und ignorieren Leerzeichen. Aufnahmetests verlangen für jede aktivierte Regel einen pfadgebundenen Clip. Gespeicherte Formenkarten und Kompatibilitätsaliase werden nicht unterstützt.

## Moduldaten zuverlässig löschen

Deinstallations-Hooks lösen aktuelle öffentliche Funktionen wie beim Modulstart auf. Damit lassen sich japanische und englische Inhaltspakete nach dem Deaktivieren des Sprachmoduls löschen. Tests prüfen beibehaltene Inhalte, beide Sprachpakete, Anbieterfehler und -wechsel sowie die Abschottung privater Funktionen.

## Große Module zuverlässig installieren

Die Modulinstallation lädt den exakten Katalog-Commit einmal, erlaubt längere laufende Downloads und erkennt blockierte Übertragungen. Der Browser wartet auf das Serverergebnis, statt nach zwei Minuten einen TLS-Fehler zu melden. Verbindungsfehler und Installationszeitlimits haben getrennte übersetzte Meldungen; Protokolle erfassen die Übertragungsphase, ohne einen MTU-Fehler vorauszusetzen.

## Zusammengesetzte Kartentitel

Flashcards zeigt die kanonischen Bestandteile zusammengesetzter Titel als einzeln umrahmte, per Tastatur bedienbare Steuerelemente. Die Library stellt ihre bestehende Titelauflösung als an die Anbieterlebensdauer gebundene UI-Fähigkeit bereit und bewahrt wörtlichen Text, Reihenfolge und Transformationen. Explore öffnet nach der bestehenden Bestätigung die ausgewählte Form; einfache Kartentitel und Favoritenschaltflächen behalten ihr nahtloses Erscheinungsbild.

## Gleichwertige Antworten fair bewerten

Lesequizze verwenden denselben Antwortvergleich für Auswahl, Hinweise und Bewertung. Reine Formatierungsvarianten werden nicht als unterschiedliche Antworten angeboten und verursachen keinen fehlgeschlagenen Fortschritt. Kleinere Mengen verschiedener Antworten bleiben spielbar. Verneinungen, Zahlen und bedeutungstragende innere Satzzeichen bleiben unterscheidbar.

## Anbietergesteuerte Sichtbarkeit von Karussell-Einträgen

Jeder Eintrag in `tag_carousels` muss `excludeFromBrowse` deklarieren: `false` erhält sichtbaren Wortschatz in der normalen Ansicht; `true` reserviert ihn für den Composer. Diese ausdrückliche Anbieterentscheidung ist unabhängig von ausgeblendeten Aussprachehilfen. Das bisherige Auswahlverhalten der Metadatenfilter bleibt erhalten.

## Direktes Laden von Study wiederherstellen

Die öffentlichen Import-URLs des Study-Gateways wurden korrigiert und der gemeinsame Katalog der Definitionssprachen in das öffentliche Wiederverwendungsverzeichnis der Library verschoben. Ein Regressionstest lädt Provider und Seitenimporte über den echten statischen Router und prüft damit Pfade, deren Fehler bisher durch Bundling-Aliase verdeckt wurden.

## Aktive Modulaktion anzeigen

Modulschaltflächen zeigen während der jeweiligen Aktion „Wird aktiviert“, „Wird deaktiviert“ oder „Wird deinstalliert“ statt fälschlich „Wird installiert“. Die Beschriftungen für Upgrades und Downgrades bleiben erhalten.

## Kuratierte Lernklassifikationen

`detail.tags` einer Ebene legt ausdrücklich fest, welche lokalisierten Tags als Lernmerkmale erscheinen; interne Tags bleiben für Transformationen und Bearbeitung gespeichert. Nur mit `filterable` markierte Tags werden Filter. Optionsbeschriftungen sind lokalisiert; Filter folgen der vom Anbieter festgelegten Reihenfolge. Optionale Felder können mit `detail.autoSelectSingle: false` ohne Anfangsauswahl starten.

Ein Zeichenkettenfeld kann `derivation: { kind: "rankedReferences", relationships, values, requireAll, transformationValues }` deklarieren. Die Werte reichen von leicht bis schwer. Die Auflösung nutzt kanonische Referenz-IDs; ausgewählte Transformationsregeln tragen ihre deklarierten Stufen bei. Ein gespeicherter Feldwert legt eine grammatische Mindestanforderung fest. Sätze entsprechen genau der höchsten Anforderung: N5 + N4 ergibt N4; reine N5-Sätze und Sätze mit N3-Inhalten passen nicht zu N4. Fehlende, mehrdeutige oder unzugängliche Einstufungen bleiben bei `requireAll` unklassifiziert. Die Auflösung wird pro Darstellung zwischengespeichert, verändert keine gespeicherten Karten und folgt Änderungen der referenzierten Inhalte.

## Generische Schwierigkeitsprofile

Beide Study-Module verwenden das kanonische Feld `difficulty_level`. Identische Normalisierung und Vertragstests lesen `data/library/difficulty.json`; Beschriftungen, geordnete Optionen, Quelltag-Zuordnungen, Grundstufen und Transformationsanforderungen sind Daten. Japanisch zeigt JLPT N5–N1, Englisch verwendet die bestehenden Kategorien Anfänger/Mittelstufe/Fortgeschritten. Unbekannte Werte bleiben unklassifiziert. Der Host ordnet deklarierte Felder ohne sprachspezifische Regeln oder alternative Feldnamen ein.

## Jede geöffnete Karte als angesehen markieren

Das Öffnen von Details über Direktlinks, Beziehungen oder Vor-/Zurück-Navigation speichert die kanonische Karte für den angemeldeten Benutzer als angesehen. Dasselbe gilt für den Editor. Erfolgreiche Schreibvorgänge entfernen passende Vorschaumarker und aktualisieren den lokalen Zustand; gleichzeitiges Überfahren und Öffnen teilt denselben Vorgang. Fehler bleiben wiederholbar, ohne Details zu blockieren. Fehlgeschlagene oder abgebrochene Öffnungen markieren keine ungesehenen Karten; geöffnete Details zeigen kein veraltetes Neu-Merkmal.

## Commits

- [2db6fd1a](https://github.com/Cognis-Labs-HQ/Cognis/commit/2db6fd1a147194de35f45b07090d0b5356206933)
- [45c1c7e0](https://github.com/Cognis-Labs-HQ/Cognis/commit/45c1c7e011bfde255e69e0dcf87b01e95600c49a)
- [2b1ff9e2](https://github.com/Cognis-Labs-HQ/Cognis/commit/2b1ff9e205cab5fb1645370b367efa76f1e9b199)
- [8a0ef5f9](https://github.com/Cognis-Labs-HQ/Cognis/commit/8a0ef5f9)
- [8d2b4358](https://github.com/Cognis-Labs-HQ/Cognis/commit/8d2b4358c176a447bb60e9248f40c1234f8cb143)
- [e4f406f1](https://github.com/Cognis-Labs-HQ/Cognis/commit/e4f406f16a3f0635a6f25206d19d19706cedbbbc)
- [a7891aaa](https://github.com/Cognis-Labs-HQ/Cognis/commit/a7891aaa8195180c45fa490ada5469d2d306c62b)
- [b8a1852e](https://github.com/Cognis-Labs-HQ/Cognis/commit/b8a1852e1f4aa45ce950ad49484f818c713341d2)
- [820d53f6](https://github.com/Cognis-Labs-HQ/Cognis/commit/820d53f65816655949a0a1f47068a10cdfc51178)
- [8be331f9](https://github.com/Cognis-Labs-HQ/Cognis/commit/8be331f9bc1a54edc80c10e53a4e4d2704a4f7b5)
- [3c72e487](https://github.com/Cognis-Labs-HQ/Cognis/commit/3c72e4870f99213562fb3796b4d76624486ba272)
- [25309509](https://github.com/Cognis-Labs-HQ/Cognis/commit/25309509877018b8d1a4633636f9d45daeef45b4)
- [de20ea2c0](https://github.com/Cognis-Labs-HQ/Cognis/commit/de20ea2c0)
- [92ef5510](https://github.com/Cognis-Labs-HQ/Cognis/commit/92ef5510)
- [b38f8b31](https://github.com/Cognis-Labs-HQ/Cognis/commit/b38f8b31)
- [f9ce159d](https://github.com/Cognis-Labs-HQ/Cognis/commit/f9ce159da8ad07c2ff59f913eebab32a69f26921)
- [03dd55f0](https://github.com/Cognis-Labs-HQ/Cognis/commit/03dd55f02c762ae99dc3870322ceb9864cb9e325)
- [e8019a21](https://github.com/Cognis-Labs-HQ/Cognis/commit/e8019a21e12295863fcf009a52385c85069498de)
- [806058fe](https://github.com/Cognis-Labs-HQ/Cognis/commit/806058fe26c0d127f0bacf034530b1023131d380)
- [3c0d5766](https://github.com/Cognis-Labs-HQ/Cognis/commit/3c0d57662df962ac6b5d93f793e0c8de91e1856b)
- [748063b1](https://github.com/Cognis-Labs-HQ/Cognis/commit/748063b10cc208747832e7880098858db648a415)
- [e96d273f](https://github.com/Cognis-Labs-HQ/Cognis/commit/e96d273fa56edd2c2ded09ca993724437ab85c93)
- [66867a1d](https://github.com/Cognis-Labs-HQ/Cognis/commit/66867a1d08a247fa73824aeba982ccba1f9b5d8c)
- [c113e7a1](https://github.com/Cognis-Labs-HQ/Cognis/commit/c113e7a1f5cb7bc2a86c39b8f419ae6b953de9e3)
- [af8bb812](https://github.com/Cognis-Labs-HQ/Cognis/commit/af8bb812d7c31626d877114ce657ca664bf4fe9f)
- [f9740de0](https://github.com/Cognis-Labs-HQ/Cognis/commit/f9740de0c23433da63e296677b64f21540da44db)
- [f90334ce](https://github.com/Cognis-Labs-HQ/Cognis/commit/f90334ced0dc442d6e0c1627704cd36984128910)
- [52002ada](https://github.com/Cognis-Labs-HQ/Cognis/commit/52002ada74f6d3a6e80ee796e2348128434b524c)
- [43d7b6f7](https://github.com/Cognis-Labs-HQ/Cognis/commit/43d7b6f7eee4628e6fcca5b8c72e1ba49158c290)
- [83f2805c](https://github.com/Cognis-Labs-HQ/Cognis/commit/83f2805c9a325388982ba9e6fb90c397cbe27ab1)
- [d0698b48](https://github.com/Cognis-Labs-HQ/Cognis/commit/d0698b4841827ab1b31f559fe8054627f2bdb09d)
- [efb6dab8](https://github.com/Cognis-Labs-HQ/Cognis/commit/efb6dab89990bdff8b597eed1c71b6230d9c730a)
- [00304cc2](https://github.com/Cognis-Labs-HQ/Cognis/commit/00304cc21874f59ce90b0c5ba830e174e9b62d88)
- [8def0536](https://github.com/Cognis-Labs-HQ/Cognis/commit/8def053668ba80829faeaad2f98adde9e930a24f)
- [aaa01bce](https://github.com/Cognis-Labs-HQ/Cognis/commit/aaa01bce537f12ef50b41e4064cd6157882d469f)
- [95b8d963](https://github.com/Cognis-Labs-HQ/Cognis/commit/95b8d963272d72bdf553e5da03be4b1ae7cc91e6)
- [b20b903a](https://github.com/Cognis-Labs-HQ/Cognis/commit/b20b903a601346b5d23df2bde9620ccffdd41e50)
- [9022b8fe](https://github.com/Cognis-Labs-HQ/Cognis/commit/9022b8fe67d2c5cbcaaae8afb429b7bc426893e4)

Optionale Einzelauswahlfelder enthalten die lokalisierte Auswahl **Nicht angegeben**. Beim Bearbeiten einer nicht eingestuften Karte bleibt ihre unbekannte Schwierigkeit erhalten, statt stillschweigend die erste Stufe zu wählen.

Implementierungsnachweis: [`1eae7cd32a771b2d5cab37e5e1b9a981851ca3ab`](https://github.com/Cognis-Labs-HQ/Cognis/commit/1eae7cd32a771b2d5cab37e5e1b9a981851ca3ab).

Die Stapelseitenleiste scrollt innerhalb der sichtbaren Seitenhöhe unabhängig. Lange Stapellisten verlängern die Seite nicht und schieben die Übung nicht nach unten.

Seitenüberlagerungen werden am Dokumentkörper eingehängt, damit Hintergrundfilter und Begrenzungsblöcke des Arbeitsbereichs die Fensterposition nicht verschieben. Das Zeichenfeld bleibt auf den sichtbaren Seitenbereich begrenzt und behält beim Scrollen seine verschobene Position.

Beim Öffnen eines anderen Stapels wird dessen Inhalt sofort sichtbar; die Rückkehr von Explore erhält die gespeicherte Übungsposition.

Implementierungsnachweis: [`23555ea0ac51246cd349ad1534991d78c4810f2a`](https://github.com/Cognis-Labs-HQ/Cognis/commit/23555ea0ac51246cd349ad1534991d78c4810f2a).

Lesezugriffe auf den Wörterbuchsuchkontext verwenden `study:library:readSearchContext` mit Autorisierung und Auflösung. Schreibzugriffe behalten `study:library:searchContext` und prüfen Eingaben vor dem Speichern; Erweiterungen können sie vor der Dienstvalidierung anpassen. Beide Vorgänge weisen Identitäten geteilter Links zurück. Schreibzugriffe stoppen bei 16 KiB mit HTTP 413; fehlerhaftes JSON liefert HTTP 400 und ersetzt keinen gespeicherten Zustand. Unerwartete Fehler geben nur einen stabilen Fehlercode zurück.

Implementierungsnachweis: [`d88441ce8a0bedb3c6c03488b0ad7ede5a2fdfac`](https://github.com/Cognis-Labs-HQ/Cognis/commit/d88441ce8a0bedb3c6c03488b0ad7ede5a2fdfac).

## Komponentengrenzen und Laufzeit

Die API delegiert Erweiterungsnamensräume über Richtlinien aktiver Gateways; Study besitzt die Regeln für Sprachnamensräume. Library entfernt seine öffentlichen Funktionen, wenn der Adapter oder seine Study-Abhängigkeiten deaktiviert sind, weist gespeicherte Funktionsreferenzen zurück und registriert sie beim Aktivieren erneut. Study-Adapter verwenden `onAvailabilityChange(listener)` für laufzeitgebundene Beiträge; ein fehlgeschlagener Start entfernt diese.

## Benachrichtigungen und Speicherung

Mitteilungen über neue und entfernte Library-Inhalte enthalten englische, deutsche, indonesische und japanische Texte aus XML-Katalogen, nutzen Englisch als Ersatz und durchlaufen `study:library:notifyContent`. Kartenbeschriftungen werden bei der Ersetzung nicht erneut interpretiert. Auch privilegierte Schreibvorgänge benötigen eine vorhandene Klasse. Leaderboard-Beobachtungen werden bei Speicherfehlern zurückgesetzt; der Saisonwechsel berechnet nach einem Neustart die endgültige Rangliste neu und stellt bei Speicherfehlern den Zustand wieder her. Verifizierte Administratoren können passende Integrationsbindungen ohne Raummitgliedschaft lösen.

## Grenzen der Verhaltenstests

Browsertests laden echte Modulexporte mit ausdrücklich vorgegebenen Abhängigkeiten über gemeinsame Testwerkzeuge. Editor-, Zeichen- und Ablaufprüfungen verwenden öffentliche Aktionen statt extrahierter privater Funktionen. Flashcards nutzt direkt ein eigenes Modul für den Stapel-Editor.

Implementierung: [b2bbcf43ddfcdcfa9ae780cf33aab1c7527a2f61](https://github.com/Cognis-Labs-HQ/Cognis/commit/b2bbcf43ddfcdcfa9ae780cf33aab1c7527a2f61).
