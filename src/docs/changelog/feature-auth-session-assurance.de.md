# Abgesicherte Anmeldungen

**Feature-Zweig:** feature-auth-session-assurance

## Sitzungsabschluss verzögern

Vollständige Authentifizierung vor Profilaktivierung und gewöhnlicher Tokenausstellung verlangen. Bei Lebenszyklus- oder TFA-Prüffehlern sicher ablehnen, ausdrückliche administrative Deaktivierung beibehalten und Wiederherstellungscodes bei Anbieterausfällen verfügbar halten.

## Abschlussgrenzen prüfen

Gestufte Eigentümerverträge, atomaren Verbrauch von Anmeldeversuchen, Schutz vor gleichzeitiger Einrichtung, übersetzte Fehler und komponenteneigene Offline-Regressionstests ergänzen. Primäre Anmeldeerweiterungen laufen vor der Prüfung; abgeschlossene Anmeldungen verwenden jetzt `auth:login`.

## Initialisierungsfehler erhalten

Core 0.6.4 erfasst Bootstrap-Fehler gefundener Gateways getrennt von ausführbaren Registrierungen. Auth unterscheidet echte optionale Abwesenheit und bewusste Deaktivierung von fehlgeschlagener Initialisierung. Auth 2.2.5 und TFA 1.3.7 verwenden abschließende Fähigkeiten nach allen erweiterbaren Richtlinienprüfungen, mit operationsbezogenem Tokenwiderruf und dokumentierten nichttransaktionalen Lebenszyklusgrenzen.

## Commits

- [0f5aaa8: Sitzungen erst nach abschließender Prüfung festlegen](https://github.com/Cognis-Labs-HQ/Cognis/commit/0f5aaa8b1ef309db23b947ea6361dc3369e4713f)
