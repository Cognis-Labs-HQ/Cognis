# Jitsi-Meet-Modul

## Überblick

Das Jitsi-Meet-Modul ist ein eigenständiges Modul (`src/modules/jitsi-meet`) mit Cognis-gesteuerter Meeting-Orchestrierung für Benutzerpaare sowie Klassen-/manuelle Entitäten.

Es bietet:

- einen globalen **Meetings**-Eintrag in der Navbar,
- eine auf dem Page Composer basierende Meetings-Seite mit getrennten bearbeitbaren Bereichen (Meeting-Fenster, Teilnehmersteuerung, Chat-Fenster),
- administrativ verwaltete Jitsi-Instanz-Konfiguration,
- datenbankgestützte wiederverwendbare Meeting-Entitäten mit Teilnehmerdurchsetzung.

## Sicherheitsmodell

- Meeting-URLs werden serverseitig aus deterministischen Raum-Slugs erzeugt und nicht als kopierbare UI-Metadaten angezeigt.
- Der native Jitsi-Chat ist deaktiviert; stattdessen wird Cognis-Chat verknüpft.
- Teilnehmermitgliedschaft wird durch Cognis über Modul-DB-Prüfungen erzwungen.
- Nur der Meeting-Eigentümer darf Teilnehmermitgliedschaften ändern.
