# Jitsi-Meet-Modul

## Zusammenfassung

Das Jitsi-Meet-Modul bietet Cognis-native Meeting-Orchestrierung mit Teilnehmerauswahl, Wiederverwendung von Meeting-URLs, Sitzungsübernahme und Wiederverwendung von Nachrichten-Chaträumen.

## Funktionen

- Konfigurierbare Jitsi-Instanz-URL und optionales URI-Präfix (Administration → Komponenten)
- `/meeting`-Seite mit:
  - Meeting-Bereich/Overlay
  - Teilnehmerauswahl und Drag-and-Drop
  - Chat-URL-Übergabe an den Messages-Adapter
- Meeting-Persistenz in modulspezifischen Tabellen
- Teilnehmergebundene API-Zugriffe per Benutzername
- Classroom-Fallback-Autorisierung, wenn `classroom_id` gesetzt ist
- Live-Meeting-Überwachung in Administration → Meetings

## Sicherheitshinweise

- API-Aufrufe erfordern ein gültiges Cognis-Access-Token.
- Meeting-Details werden nur an berechtigte Teilnehmer ausgegeben.
- Meeting-Passwörter werden pro Meeting-Datensatz generiert.
- Die Sitzungsübernahme ermöglicht das Trennen einer vorherigen aktiven Sitzung.
