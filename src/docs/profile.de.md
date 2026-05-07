# Profil

## Überblick

Das Profil-Feature gibt jedem Account eine öffentlich zugängliche Identität, einen sozialen Graphen, einen Microblog-Post-Stream und Datei-Upload-Fähigkeiten. Es ist als Profil-Gateway implementiert.

Sichtbarkeit ist ein zentrales Anliegen. Jeder Account wählt eine Sichtbarkeitsstufe, die regelt, wer sein Profil, soziale Zähler und Beiträge sehen kann. Blockierte Accounts erhalten 404-Antworten auf jeden Endpunkt, der den Blocker anspricht.

## Verantwortlichkeiten

- Die Datenbanktabellen `account_profiles`, `account_follows`, `account_blocks`, `posts` und `file_size_limits` besitzen.
- Account- und Post-Level-Sichtbarkeit auf allen Profil- und Inhalts-Endpunkten durchsetzen.
- Avatar- und Banner-Uploads über das Datei-Gateway verwalten.
- Den sozialen Graphen pflegen: Folgen, Entfolgen, Blockieren, Entblocken.

## Architektur

### Sichtbarkeitsmodell

| Stufe | Profil sichtbar für | Beiträge und Zahlen sichtbar für |
| ----- | ------------------- | -------------------------------- |
| `hidden` (Standard) | Nur Selbst und Admin | — (Posten blockiert; gibt 403 zurück) |
| `private` | Nur bestehende Follower | Nur Follower |
| `friends` | Jeder authentifizierte Benutzer | Nur Follower |
| `community` | Jeder authentifizierte Benutzer | Jeder authentifizierte Benutzer |

Beitrags-Sichtbarkeit (`only_me | private | friends | community`) ist immer durch die Account-Stufe begrenzt. Blockierte Aufrufer erhalten 404 auf jedem Endpunkt, der den Blocker anspricht.

### Frontend-Seitenstruktur

| Element | Standard sichtbar | Rastergröße |
| ------- | ----------------- | ----------- |
| `hero` | Ja | full |
| `followers` | Ja | `[2, 3]` |
| `following` | Ja | `[2, 3]` |
| `posts` | Ja | full |
| `social-links` | Nein | `[2, 3]` |
