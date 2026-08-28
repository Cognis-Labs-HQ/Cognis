# Admin- und Compliance-Update

**Feature Branch:** copilot/comply-codebase-instructions

## Sicherheitsbereich in Admin gebündelt

Der separate Bereich Administration → Authentifizierung wurde entfernt, indem die Auth-Admin-Section nicht mehr registriert wird. Passwort-Richtlinien liegen jetzt direkt unter Administration → Sicherheit zusammen mit vertrauenswürdigen Domains, Registrierungssteuerung, Validierungsmethode und Lehrerfreigabe.

## Redundante Auth-UI reduziert

Veraltete auth-spezifische Administrationsdateien für den entfernten Authentifizierungsbereich wurden gelöscht. Das reduziert Wartungsaufwand und entfernt doppelte Konfigurationsoberflächen.

## Compliance-Guardrail-Tests ergänzt

Neue Architekturtests erzwingen Verzeichnisregeln für UI- und API-Routen, blockieren neue Quell-Dateien über 1000 Zeilen und verhindern neue direkte Core/API-zu-Gateway-Kopplung außerhalb eines eng begrenzten Altbestands.

## Ctx-First Auth-Verdrahtung verschärft

Server- und Modul-Extension-Routen nutzen jetzt injizierten Route-Auth-Kontext statt impliziter Fallback-Verdrahtung. Beim Start wird nun sofort abgebrochen, wenn der Auth-Route-Kontext fehlt.

## AI-Instruktionsziele präzisiert

Die AI-Instruktionen wurden explizit erweitert: LOC-Disziplin, keine Bewertung großer Diffs als Erfolgssignal, generische Benennung, echte Reuse-Grenzen, getrennte HTML- und JS/TS-Dateien sowie Aufteilung übergroßer Dateien in Verzeichnisstrukturen mit Einstiegspunkt.

## Commits

- [a267b4c](https://github.com/Cognis-Labs-HQ/Cognis/commit/a267b4cce59173b5060e5035a628583868afa39e)
