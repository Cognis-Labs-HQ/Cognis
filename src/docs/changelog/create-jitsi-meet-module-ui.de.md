# Jitsi-Meet-Modul-Grundlage

## Zusammenfassung

Ein neues Jitsi-Meet-Modul mit konfigurierbaren Instanz-Einstellungen, Meeting-Persistenz, teilnehmergebundenen Zugriffskontrollen, Meeting-Sitzungsstatus-APIs, eigener Meetings-Seite und Administrationsüberwachung wurde hinzugefügt.

Nachfolgende Verbesserungen:

- Das Layout der Meetings-Seite wird vollständig durch den Composer gesteuert: Das Teilnehmer-Panel ist oben in voller Breite; Meeting-Fenster und Chat nehmen jeweils genau die halbe verfügbare Rasterbreite ein (`gridSize.max: 'half'`).
- „Meeting Overlay" wurde durchgängig in „Meeting-Fenster" umbenannt.
- Die Tabelle „Verfügbare Teilnehmer" wird beim Laden der Seite mit allen sichtbaren Benutzern vorbelegt.
- Die Teilnehmersuche wurde durch ein Popup ersetzt (entspricht der „Neues Gespräch"-UX in Nachrichten).
- Neuer Endpunkt `GET /api/v1/modules/jitsi-meet/participants?q=` liefert sichtbare Profile (alle bei leerem `q`, gefiltert sonst).
- Teilnehmer-Tabellen wurden durch einen Avatar-Pool ersetzt: Jeder Avatar ist ziehbar (mit Hover-Profilvorschau), kann auf das Meeting-Fenster gezogen werden (grüne Drop-Zone-Hervorhebung) und erscheint dann oberhalb des Titels „Meeting-Fenster".
- Das Popup „Teilnehmer suchen" unterstützt jetzt Mehrfachauswahl mit einem schwebenden „Ausgewählte hinzufügen"-Button; alle ausgewählten Benutzer werden beim Bestätigen dem verfügbaren Pool hinzugefügt.
- Composer-Anpassung und Layout-Persistenz aktiviert.
- Vorab-Meeting-Chatnachricht auf „Warten auf Meeting-Start." geändert.
- Die Vorab-Prüfung zeigt jetzt ein grünes Häkchen, sobald die Jitsi-Instanz eine gesunde Probe-Antwort liefert.
- Fehler 400 bei Meeting-Erstellung behoben (Ursache: Groß-/Kleinschreibungsabhängige Handle-Suche); `getProfileByHandle` verwendet jetzt einen Groß-/Kleinschreibungsunabhängigen Vergleich.
- Verwaltung → Komponenten: Der Einstellungsbutton wurde aus dem `<summary>`-Chevron in den erweiterten Moduldetailbereich verschoben und das Zahnrad-Symbol durch einen Text-Button „Einstellungen" ersetzt.
- Das Meeting-Store-Schema ist zukunftsorientiert: `ensureTable` definiert den maßgeblichen Spaltensatz; Rückwärtskompatibilitätscode für ältere Schemata wurde vollständig entfernt.
- Die Meeting-Erstellung schreibt jetzt `room_slug` aus dem generierten URL-Slug, damit Datenbanken mit weiterhin `NOT NULL` gesetzter Legacy-Spalte `room_slug` nicht mehr fehlschlagen.
- Mit Meetings verknüpfte Gruppenchats enthalten jetzt das Meeting-Datum im Raumnamen.
- Ein Klick auf die Mitgliederanzahl in einem Meeting-Gruppenchat öffnet jetzt ein Popup mit den aktuell anwesenden Benutzern und verlinkten Avataren für Profilvorschauen.
- Das Meeting-Fenster verwendet im hellen Design jetzt eine deutlich hellere Overlay-Darstellung, damit die Vorab-Ansicht nicht mehr zu stark abgedunkelt ist.

## Geänderte Dateien / Komponenten

- `src/modules/jitsi-meet/ui/app.js` (Avatar-Pool, Mehrfachauswahl, grünes Häkchen, Drag-to-Stage, Composer-Optionen)
- `src/modules/jitsi-meet/ui/jitsi-meet.css` (Avatar-Pool, platzierte Teilnehmer, Drop-Zone-Hervorhebung, Häkchen-Indikator)
- `src/modules/jitsi-meet/ui/languages/*/strings.xml` (neue Keys: probe_done, add_selected; chat.pending aktualisiert)
- `src/ui/reuse/search-bar.js` (multiSelect + onSelectMultiple-Unterstützung, Bestätigungs-Footer)
- `src/ui/styles/reuse/search-bar.css` (Mehrfachauswahl-Ergebnisstile, Bestätigungs-Footer)
- `src/ui/styles/page-builder.css` (Einstellungsbutton-Stil, Zahnrad-Button-Stile entfernt)
- `src/ui/app/administration/index.js` (Einstellungsbutton in erweiterten Bereich verschoben)
- `src/adapters/social/profile/store.ts` (Groß-/Kleinschreibungsunabhängiges getProfileByHandle)
- `src/modules/jitsi-meet/api/store.js` (zukunftsorientiertes Schema plus `room_slug`-Kompatibilität beim Meeting-Insert)
- `src/modules/jitsi-meet/api/index.js` (datierte Meeting-Chat-Titel, Chat-Raum-Zusammenfassungs-Endpunkt)
- `src/adapters/social/messages/ui/app.js` (anklickbare Mitgliederanzahl mit Popup für Anwesenheitsübersichten)
- `src/adapters/social/messages/ui/messages.css` (Popup-Stile für Mitgliedsübersicht und anklickbarer Untertitel)
- `src/adapters/social/messages/ui/languages/*/strings.xml` (Strings für Anwesenheitsübersicht)
- `src/modules/jitsi-meet/api/tests/store.test.js` (`room_slug`-Prüfung ergänzt: Wert wird aus dem Meeting-URL-Slug gesetzt)
- `src/ui/tests/regression-followups.test.js` (Regressionen für Meeting-Chat-Titel und Mitgliederübersicht)
- `src/modules/jitsi-meet/ui/jitsi-meet.css` (helleres Meeting-Fenster-Overlay, Spinner- und Staged-User-Kontrast im hellen Design)

## Commit-Links

- https://github.com/le-firehawk/Cognis/commit/a1a90e53bc3366961181b3cbd4d09094179a463c
- https://github.com/le-firehawk/Cognis/commit/224a1bfb594412391c5dea99962fb9dc8c432396
- https://github.com/le-firehawk/Cognis/commit/65261ce6
