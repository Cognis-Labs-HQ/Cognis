# Jitsi-Meet-Modul-Grundlage

**Feature Branch:** copilot/create-jitsi-meet-module-ui

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
- Der Chat auf der Meetings-Seite wird jetzt nativ innerhalb der Seite über die Messages-APIs gerendert, statt eine zweite Chat-Seite aus einer anderen URL einzubetten.
- Die Pre-Flight-Prüfung läuft jetzt vor dem Meeting-Start, bleibt unabhängig von der Teilnehmerauswahl sichtbar und blockiert den Start, bis sie erfolgreich ist.
- Eingebettete Jitsi-Beitritte füllen Teilnehmerinformationen vorab aus, überspringen den zusätzlichen Vorab-Beitrittsschritt und trennen den verdrängten Tab, wenn eine andere Sitzung das Meeting übernimmt.
- Generierte Meeting-Slugs bleiben jetzt lesbar (`classroom-xxxxxxxx` / `cognis-classroom-xxxxxxxx`), sodass Jitsi keinen verstümmelten Beitrittsnamen mehr anzeigt.
- Meeting-Fenster und Chat starten jetzt wieder standardmäßig in einer Halbbreite/Halbbreite-Aufteilung, bleiben frei in Höhe und Breite anpassbar und verwenden einen erneuerten Layout-Präferenzschlüssel, um das versehentliche Vollbreiten-Layout zurückzusetzen.
- Wiederverwendete Meetings zeigen jetzt nach einem bereits beendeten Meeting keine falsche Sitzung-übernehmen-Aufforderung mehr an, lösen beim Warten auf die Übernahme keinen falschen „anderswo übernommen“-Toast mehr aus und zeigen klare Overlay-Meldungen, wenn das Meeting für alle endet oder wenn ein Teilnehmer es verlässt.
- Meetings übernehmen jetzt konsequent das aktive Cognis-Hell/Dunkel-Design im Jitsi-Fenster, zeigen ein neues Panel „Aktive Meetings“ neben „Verfügbare Teilnehmer“ für Sofortbeitritte und leiten Meeting-Benachrichtigungen per Deep-Link direkt zum passenden aktiven Meeting weiter (inklusive „Meeting beendet“-Auffangzustand).

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
- `src/modules/jitsi-meet/ui/app.js` (nativer Meeting-Chat, vorgelagerte Pre-Flight-Sperre, vorausgefüllte Jitsi-Beitritts-URL, Kick-out bei Sitzungsübernahme)
- `src/modules/jitsi-meet/ui/app.js` (Meeting-Fenster und Chat wieder mit Halbbreiten-Standard und freier Größenanpassung, erneuerter Layout-Präferenzschlüssel)
- `src/modules/jitsi-meet/ui/app.js` (Overlay-Meldungen für Meeting-Ende/Verlassen, Fix für Reclaim-Polling, gesteuerte Sitzungsverfolgung)
- `src/modules/jitsi-meet/api/index.js` (benutzerseitiger Pre-Flight-Endpunkt, Statusmeldung zur aktiven Sitzung für Sitzungsübernahmen)
- `src/modules/jitsi-meet/ui/app.js` (Theme-Abgleich, Panel „Aktive Meetings“, Sofortbeitritt/Deep-Link-Verhalten)
- `src/modules/jitsi-meet/api/index.js` (Aktive-Meetings-Endpunkt für Benutzer und absenderbezogene Meeting-Deep-Link-Benachrichtigungen)
- `src/modules/jitsi-meet/api/store.js` (lesbare Standard-Erzeugung für Meeting-Slugs, Zustandsfelder für beendete Meetings, Hilfen für aktuelle Präsenz und aktive-Meeting-Metadaten)
- `src/modules/jitsi-meet/ui/jitsi-meet.css` (Layout und Responsive-Styling für das Panel „Aktive Meetings“)
- `src/modules/jitsi-meet/ui/languages/*/strings.xml` (Texte für nativen Chat, Pre-Flight und Sitzungsübernahme)
- `src/ui/tests/regression-followups.test.js` (Regressionen für Meeting-Ende / Sitzungsübernahme)
- `src/ui/tests/regression-followups.test.js` (Regressionen für aktive Meetings / Deep-Link-Benachrichtigungen)
- `src/modules/jitsi-meet/package.json` (Modulversion auf `1.0.5` erhöht)
- `src/modules/jitsi-meet/manifest.json` (Manifest-Version des Moduls auf `1.0.5` erhöht)
- `src/docs/versions.en.md` (Jitsi-Meet-Version auf `1.0.5` aktualisiert)

## Commit-Links

- https://github.com/Cognis-Labs-HQ/Cognis/commit/a1a90e53bc3366961181b3cbd4d09094179a463c
- https://github.com/Cognis-Labs-HQ/Cognis/commit/224a1bfb594412391c5dea99962fb9dc8c432396
- https://github.com/Cognis-Labs-HQ/Cognis/commit/65261ce6
- https://github.com/Cognis-Labs-HQ/Cognis/commit/642ddf56
