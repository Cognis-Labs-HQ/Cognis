# Text-/Markdown-Adapter

## Überblick

Der Text-Adapter ist der File-Reader-Adapter für reine Textdateien und Markdown-Dateien. In einem Kursraum fungiert er gleichzeitig als Notizblock – ein Rich-Text-Editor, den Lehrkräfte und Lernende verwenden, um Notizen zu schreiben, zu formatieren und direkt in den Kursmaterialien zu speichern. Derselbe Adapter übernimmt sowohl das schreibgeschützte Betrachten von Dateien als auch das interaktive Bearbeiten von Notizen.

## Zuständigkeiten

- Unterstützung für die MIME-Typen `text/plain` und `text/markdown` beim File-Reader-Gateway registrieren.
- Kursraum-Notizblock-Lese-/Schreibrouten für authentifizierte Benutzer bereitstellen.
- Die Fähigkeit `file-reader:text:ui` mit Viewer-Skript, Stylesheet und Basis-URL für Sprachstrings beitragen.
- Die Umgebungsvariable `TEXT_FILE_READER_MAX_BYTES` normalisieren und innerhalb sicherer Grenzen begrenzen.

Nicht zuständig für: Speichern der zugrunde liegenden Datei-Bytes (das übernimmt das Dateispeicher-Gateway), Durchsetzen von Upload-Größenlimits beim Eingang oder Rendern anderer Formate als Text und Markdown.

## Architektur

`src/adapters/file-reader/text/index.ts` übernimmt den Bootstrap: Er löst den optionalen Route-Kontext aus `auth:routeContext` auf, wendet die `TEXT_FILE_READER_MAX_BYTES`-Überschreibung an und registriert die Notizblock-API-Routen.

## Konfiguration

| Variable                     | Standardwert      | Beschreibung                                                          |
| ---------------------------- | ----------------- | --------------------------------------------------------------------- |
| `TEXT_FILE_READER_MAX_BYTES` | `262144` (256 KB) | Maximale Byte-Größe einer Textdatei. Begrenzt auf `[16384, 4194304]`. |

## API-Routen

| Methode | Pfad                                | Beschreibung                                   | Authentifizierung |
| ------- | ----------------------------------- | ---------------------------------------------- | ----------------- |
| `GET`   | `/api/v1/study/classes/:id/notepad` | Aktuellen Notizblock-Inhalt abrufen            | Erforderlich      |
| `PUT`   | `/api/v1/study/classes/:id/notepad` | Notizblock-Inhalt in Kursmaterialien speichern | Erforderlich      |
