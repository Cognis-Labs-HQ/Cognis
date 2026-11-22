# Typverträge für die Authentifizierung

**Feature-Zweig:** feature-auth-type-contracts

## Typisierte Authentifizierungsgrenzen

Die Deklarationen von Auth und TFA beschreiben die bestehenden Kontorollen, externen Identitätsfelder, Datenbankbefehle und Cookie-Sitzungsdaten. Die Prüfung des Sitzungslimits akzeptiert dieselben Zahlenwerte. Die Anmeldeabsicherung und einmalig verwendbare Faktorversuche bleiben unverändert.

## Vertragstreue Komponententests

Authentifizierungsfixtures verwenden den tatsächlichen strukturierten Datenbankvertrag und registrierte Ablaufstufen. HTTP-Routentests übergeben die vorgesehenen Anfragemetadaten und behalten Prüfungen für Ablehnung, Speicherung und Lebenszyklus bei. Die vollständige Typprüfung umfasst Produktions- und Testdateien.

## Commits

- [111678dc84dee7c6d9bfcfbe83583b4c68f19392](https://github.com/Cognis-Labs-HQ/Cognis/commit/111678dc84dee7c6d9bfcfbe83583b4c68f19392)
- [c4f6ddf9f21a744f7d9133292f614e98467d829f](https://github.com/Cognis-Labs-HQ/Cognis/commit/c4f6ddf9f21a744f7d9133292f614e98467d829f)
- [be83c1b8857ed540915606f4477053f3f54b933a](https://github.com/Cognis-Labs-HQ/Cognis/commit/be83c1b8857ed540915606f4477053f3f54b933a)
