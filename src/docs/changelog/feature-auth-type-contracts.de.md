# Typverträge für die Authentifizierung

**Feature-Zweig:** feature-auth-type-contracts

## Typisierte Authentifizierungsgrenzen

Die Deklarationen von Auth und TFA beschreiben die bestehenden Kontorollen, externen Identitätsfelder, Datenbankbefehle und Cookie-Sitzungsdaten. Die Prüfung des Sitzungslimits akzeptiert dieselben Zahlenwerte. Die Anmeldeabsicherung und einmalig verwendbare Faktorversuche bleiben unverändert.

## Vertragstreue Komponententests

Authentifizierungsfixtures verwenden den tatsächlichen strukturierten Datenbankvertrag und registrierte Ablaufstufen. HTTP-Routentests übergeben die vorgesehenen Anfragemetadaten und behalten Prüfungen für Ablehnung, Speicherung und Lebenszyklus bei. Die vollständige Typprüfung umfasst Produktions- und Testdateien.

## Commits

- [f731cb62ccf6b430a3b33b082d4e083157158a83](https://github.com/Cognis-Labs-HQ/Cognis/commit/f731cb62ccf6b430a3b33b082d4e083157158a83)
- [ada8231e5710e9eb57aba6d695c020038016339f](https://github.com/Cognis-Labs-HQ/Cognis/commit/ada8231e5710e9eb57aba6d695c020038016339f)
