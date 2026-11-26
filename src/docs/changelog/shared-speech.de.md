# Gemeinsame Sprachsynthese

**Feature-Zweig:** feature-update-external-package-contract-definitions

## Nutzung

ElevenLabs-Synthese in ein eigenes konfigurierbares Modul verlagern. Study nutzt optionale sprachbezogene Stimmen für gespeicherte globale Karten. Private und Klassenkarten erlauben begrenzte Uploads und Mikrofonaufnahmen. Die kontinuierliche Satzkomposition aus vorhandenen Aufnahmen bleibt als Rückfall erhalten. Administratoren können globale Audios im Editor neu erzeugen.

## Study-Aktivierung reparieren

Die tatsächlichen englischen und japanischen Inhaltspaketversionen beim Entfernen gebündelter Aufnahmen erhöhen. Unabhängige Module werden vor der Fehlermeldung vollständig abgeglichen, damit Einwilligungsrouten ihre registrierten Flows behalten.

## Sprache ohne Sonderrechte bereitstellen

`elevenlabs-tts:synthesis` im eigenen Modulnamensraum veröffentlichen und die Privilegien-Markierung entfernen. English und Japanese Study lösen diese Fähigkeit über ctx und ihre bestehende optionale Modulabhängigkeit auf. Die Study-Brücke erhält den aktuellen Fähigkeitszugriff vom Aufrufer und bewahrt Deaktivierung, erneute Aktivierung und konfigurierte Stimmen.

## Sprache optional halten

Die veröffentlichte Fähigkeit meldet ihre aktuelle Bereitschaft über `configured`. Study aktiviert automatische Sprache erst nach dem Speichern von API-Schlüssel und Standardstimme. Fehlt ElevenLabs oder ist es deaktiviert oder unkonfiguriert, gelingt die Sprachregistrierung weiterhin. Hochgeladene Aufnahmen und die Zusammenstellung vorhandener Audios bleiben verfügbar; Synthese wird nicht angefordert.

## Konfigurations-Flows im deaktivierten Zustand ausführen

Isolierte Konfigurationseinstiegspunkte dürfen ihre eigenen Flows registrieren und ausführen. Damit liefert die ElevenLabs-Konfiguration vor der Aktivierung nicht mehr `speech_unavailable`. Fremde Flows und Hooks bleiben auch für privilegierte deaktivierte Module gesperrt; fehlgeschlagene Einrichtung entfernt teilweise registrierte Flows.

## Routen bei Modulaktualisierung erhalten

Vor dem Entfernen ihrer Flows auf aktive Modulanfragen warten und neue Anfragen bis zum Abschluss des Abgleichs zurückstellen, auch bei fehlgeschlagener Aktivierung. Zustimmungsprüfungen behalten einen vollständigen Routen- und Flow-Lebenszyklus, während unabhängige Study-Module aktiviert werden.

## Commits

- [2bebe47](https://github.com/Cognis-Labs-HQ/Cognis/commit/2bebe47baf20112a4c84cff2bb65ce270c6b52eb)
- [7c495dc](https://github.com/Cognis-Labs-HQ/Cognis/commit/7c495dcda4c67bdff3c385670465baee4763b046)
- [a59ae79](https://github.com/Cognis-Labs-HQ/Cognis/commit/a59ae79222ed483ba3804bf4cdebba9beaa75203)
- [393b357](https://github.com/Cognis-Labs-HQ/Cognis/commit/393b357411ab2f828c785afc53a831ccc9dda626)
- [8c1364c](https://github.com/Cognis-Labs-HQ/Cognis/commit/8c1364cb57d291083ef77d39453787892a951d80)
