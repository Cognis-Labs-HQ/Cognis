# Typverträge für die Authentifizierung

**Feature-Zweig:** feature-auth-type-contracts

## Typisierte Authentifizierungsgrenzen

Die Deklarationen von Auth und TFA beschreiben die bestehenden Kontorollen, externen Identitätsfelder, Datenbankbefehle und Cookie-Sitzungsdaten. Die Prüfung des Sitzungslimits akzeptiert dieselben Zahlenwerte. Die Anmeldeabsicherung und einmalig verwendbare Faktorversuche bleiben unverändert.

## Vertragstreue Komponententests

Authentifizierungsfixtures verwenden den tatsächlichen strukturierten Datenbankvertrag und registrierte Ablaufstufen. HTTP-Routentests übergeben die vorgesehenen Anfragemetadaten und behalten Prüfungen für Ablehnung, Speicherung und Lebenszyklus bei. Die vollständige Typprüfung umfasst Produktions- und Testdateien.

## Commits

- [f953a13e8b8ec88c0907be13cc1891c0800ff25d](https://github.com/Cognis-Labs-HQ/Cognis/commit/f953a13e8b8ec88c0907be13cc1891c0800ff25d)
