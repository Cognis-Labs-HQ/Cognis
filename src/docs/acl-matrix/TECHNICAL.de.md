# Technische Referenz

Zugriffsregeln verbinden geordnete Kontorollen mit aktionsbezogenen Eigentums-, Mitgliedschafts- und Sichtbarkeitsprüfungen.

## Schnittstellen

`AccessRole` und `RoleAccessPolicy` exportiert Core. `hasMinRole(role, minRole)` vergleicht Ränge; `isRoleAllowed(role, { minRole, onlyRole })` prüft beide Grenzen. Authentifizierungsprüfungen bestimmen Claims vor der Routenrichtlinie.

## Konfiguration

`minRole` erlaubt genannte und höhere Rollen. `onlyRole` erlaubt genau die genannte Rolle, auch bei höherem Aufruferrang. Eigentum, Sichtbarkeit, Mitgliedschaft und Freigaben werden zusätzlich geprüft.

## Verhalten

Die Reihenfolge lautet `user < teacher < moderator < admin < owner`. Selbstregistrierung erstellt `user`; `founder` ist keine AccessRole und Einladungsberechtigung folgt Registrierung. Der Mindestrang ersetzt keine Inhaltsrechte für Profile, Dateien, Räume oder Klassen.

## Sicherheit

Prüfe Rolle und Inhaltszugriff beim Ausführen. Verborgene Steuerelemente ersetzen keine Rechte; Rollenbeschreibungen überschreiben weder onlyRole noch aktuelle Mitgliedschaft.

## Referenz

- [src/core/contracts/access-policy.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/contracts/access-policy.ts)
- [src/gateways/auth/guard.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/auth/guard.ts)
