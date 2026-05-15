# Jitsi-Meet-Modul

## Überblick

Das Jitsi-Meet-Modul ergänzt direkte 1:1-Video-Räume zwischen Nutzern in Cognis. Es liegt vollständig unter `src/modules/jitsi-meet` und enthält eigene API-Routen, UI-Seite, Navbar-Beitrag, Admin-Bereich, Sprachdateien und Dokumentation.

Admins konfigurieren nur die Jitsi-Basis-URL. Nutzer starten oder öffnen Sitzungen mit genau einem anderen Teilnehmer.

## Verantwortlichkeiten

- Persistieren der Moduleinstellungen (`baseUrl`) in `jitsi_meet_settings`.
- Persistieren von Meeting-Entitäten in `jitsi_meetings` mit FK-Teilnehmerfeldern auf `accounts(id)`.
- Erzwingen von Teilnehmer-Preflight-Prüfungen vor der Ausgabe von Meetingdaten.
- Erzeugen deterministischer Raum-Slugs pro Teilnehmerpaar.
- Bereitstellen einer Meetings-UI mit nativer Chat-Verknüpfung über Laufzeit-Suche in DM-Räumen.

Nicht verantwortlich für: Classroom-Orchestrierung, adapterseitige Jitsi-Provisionierung oder das Überschreiben von Nutzerzustimmung.
