# Typverträge für die Authentifizierung

**Feature-Zweig:** feature-auth-type-contracts

## Typisierte Authentifizierungsgrenzen

Die Deklarationen von Auth und TFA beschreiben die bestehenden Kontorollen, externen Identitätsfelder, Datenbankbefehle und Cookie-Sitzungsdaten. Die Prüfung des Sitzungslimits akzeptiert dieselben Zahlenwerte. Die Anmeldeabsicherung und einmalig verwendbare Faktorversuche bleiben unverändert.

## Vertragstreue Komponententests

Authentifizierungsfixtures verwenden den tatsächlichen strukturierten Datenbankvertrag und registrierte Ablaufstufen. HTTP-Routentests übergeben die vorgesehenen Anfragemetadaten und behalten Prüfungen für Ablehnung, Speicherung und Lebenszyklus bei. Die vollständige Typprüfung umfasst Produktions- und Testdateien.

## Commits

- [508c168554a68c00fa4493768788df625f03abe6](https://github.com/Cognis-Labs-HQ/Cognis/commit/508c168554a68c00fa4493768788df625f03abe6)
