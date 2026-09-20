# PR-225-Prüfkonformität

**Feature-Zweig:** pr-225-review-compliance

## Sicherere externe Konten

Bei der Erstellung externer Konten bleiben Anbietergrenzen nun erhalten, für ungeeignete Anbieterbezeichnungen wird ein geprüfter Adapter-Namensraum verwendet, und fehlgeschlagene Registrierungsbestätigungen werden zurückgesetzt, ohne die authentifizierte Identität als absichtlich gelöscht zu markieren.

## Korrekte Formularsemantik

Erforderliche Optionsgruppen bleiben nun ungültig, bis eine Option ausgewählt wurde. Die Profilsynchronisierung verwendet die Gestaltung für potenziell destruktive Aktionen, da sie Profildaten ersetzen kann.

## Versionskonformität

Der API-Vertrag und alle betroffenen Komponenten veröffentlichen nun abgestimmte Versionen und geprüfte Abhängigkeitsobergrenzen. Die Authentifizierungsorchestrierung wurde außerdem in überschaubare Quelldateien aufgeteilt, und LDAP-Verwaltungstests verwenden nun kanonische anbieterbezogene Kontonamen.

## Commits

- [6e3830656f89213880dbcb4429ff44239f2c2bbf](https://github.com/Cognis-Labs-HQ/Cognis/commit/6e3830656f89213880dbcb4429ff44239f2c2bbf)
