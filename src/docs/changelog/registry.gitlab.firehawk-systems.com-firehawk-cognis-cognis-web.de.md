# Portable Umgebungskonfiguration

**Feature Branch:** N/A

## Betrieb ohne Env-Dateien

Container-Orchestratoren können die Konfiguration jetzt vollständig über Umgebungsvariablen einspeisen. Eine angegebene `DATABASE_URL` wird direkt verwendet, und ihr unterstütztes URL-Schema wählt den Datenbankprovider aus, wenn `DB_TYPE` fehlt.

## Bereitstellungsneutrale Fehler

Die Entrypoint-Validierung beschreibt nun fehlende Container-Umgebungswerte, ohne von Compose erzeugte Dateien oder Einrichtungsbefehle vorauszusetzen.

## Commits
