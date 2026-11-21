# Abgesicherte Anmeldungen

**Feature-Zweig:** feature-auth-session-assurance

## Sitzungsabschluss verzögern

Vollständige Authentifizierung vor Profilaktivierung und gewöhnlicher Tokenausstellung verlangen. Bei Lebenszyklus- oder TFA-Prüffehlern sicher ablehnen, ausdrückliche administrative Deaktivierung beibehalten und Wiederherstellungscodes bei Anbieterausfällen verfügbar halten.

## Abschlussgrenzen prüfen

Gestufte Eigentümerverträge, atomaren Verbrauch von Anmeldeversuchen, Schutz vor gleichzeitiger Einrichtung, übersetzte Fehler und komponenteneigene Offline-Regressionstests ergänzen. Primäre Anmeldeerweiterungen laufen vor der Prüfung; abgeschlossene Anmeldungen verwenden jetzt `auth:login`.

## Initialisierungsfehler erhalten

Core 0.6.4 erfasst Bootstrap-Fehler gefundener Gateways getrennt von ausführbaren Registrierungen. Auth unterscheidet echte optionale Abwesenheit und bewusste Deaktivierung von fehlgeschlagener Initialisierung. Auth 2.2.5 und TFA 1.3.7 verwenden abschließende Fähigkeiten nach allen erweiterbaren Richtlinienprüfungen, mit operationsbezogenem Tokenwiderruf und dokumentierten nichttransaktionalen Lebenszyklusgrenzen.

## Commits

- [02e067b8981a5582633afe940bceff84a392ec61](https://github.com/Cognis-Labs-HQ/Cognis/commit/02e067b8981a5582633afe940bceff84a392ec61)
- [e336d6f6cc18527505a7dd259cb0a24f410a7869](https://github.com/Cognis-Labs-HQ/Cognis/commit/e336d6f6cc18527505a7dd259cb0a24f410a7869)
