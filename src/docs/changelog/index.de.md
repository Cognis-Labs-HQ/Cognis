# Changelog

**Feature Branch:** N/A

## Überblick

Dieses Verzeichnis enthält Changelog-Einträge als eine Markdown-Datei pro Pull
Request. Jede Datei beschreibt genau einen PR, damit die Änderungshistorie
modular und gut prüfbar bleibt.

## Eintragsformat

- Dateiname: `<branch-name-without-copilot-prefix>.<sprache>.md` für jede
  unterstützte Sprache (de, en, id, ja). Beispiel: Branch `copilot/fix-auth-bug`
  ergibt `fix-auth-bug.en.md`, `fix-auth-bug.de.md`, `fix-auth-bug.id.md` und
  `fix-auth-bug.ja.md`
- Ein Dateisatz pro PR (eine Datei je Sprache)
- Verbindliche Struktur in jeder Datei:
    - `# ...` — Changelog-Titel
    - `## ...` — ein Änderungspunkt pro Überschrift (als Stichpunkte in der Zusammenfassung)
    - Inhalt unter jedem `##` — Details für die Changelog-Seite

## Einträge

- [create-changelog-ingestion-system](/changelogs/create-changelog-ingestion-system)
- [cleanup-strings-and-codebase](/changelogs/cleanup-strings-and-codebase)

## Commits
