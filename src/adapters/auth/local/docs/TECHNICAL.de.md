# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Lokale Konten.

## Schnittstellen

### Architektur

`DbLocalAccountStore` in `src/adapters/auth/local/store.ts` ist die einzige Persistenzschicht für lokale Benutzerkonten.

## Konfiguration

### Konfiguration

Keine konfigurierbaren Felder. Die Credential-Verwaltung erfolgt ausschließlich über die `user:*`-CLI-Befehle oder die Registrierungs-/Anmelde-API-Routen.

Die Bereinigung externer Identitäten kann Identitäten anhand eines anbietereigenen Quellenpräfixes entfernen. Eine erneute Authentifizierung aktualisiert E-Mail, Anzeigename, Rolle und Aktivierungsstatus eines erhaltenen externen Kontos, bevor die neue Identität verknüpft wird.

## Verhalten

### Überblick

Der lokale Auth-Adapter ist der eingebaute Credential-Store für Cognis. Er verwaltet Benutzernamen und gehashte Passwörter in der eigenen Datenbank der Plattform, ohne externen Identitätsanbieter. Der lokale Adapter ist immer aktiviert und kann nicht deaktiviert werden.

### Verantwortlichkeiten

- Lokal verwaltete Anmeldedaten mit `crypto.scrypt` speichern und verifizieren.
- `register()` für die Account-Erstellung bereitstellen.
- `updateLastLogin()` für das Tracking des letzten Logins bereitstellen.
- `DbLocalAccountStore` als `LocalAccountStore`-Implementierung bereitstellen.

### Passwort-Hashing

Passwörter werden mit Node.js `crypto.scrypt` und einem 16-Byte-Zufallssalz gehasht. Gespeicherte Passwörter haben das Format:

```
scrypt:<hex-salt>:<hex-derived-key>
```

### CLI-Verwaltung

Lokale Konten werden über die `cognisctl`-CLI mit dem `user:*`-Befehlsnamespace verwaltet:

| Befehl              | Beschreibung                     |
| ------------------- | -------------------------------- |
| `user:create`       | Neues lokales Konto erstellen    |
| `user:role`         | Einer Rolle einem Konto zuweisen |
| `user:set-password` | Passwort eines Kontos ändern     |
| `user:disable`      | Konto deaktivieren               |
| `user:enable`       | Deaktiviertes Konto reaktivieren |
| `user:delete`       | Konto löschen                    |

## Sicherheit

Lokale Passwörter nutzen scrypt mit Zufallssalz und zeitkonstanter Prüfung. Kontoverwaltung benötigt Auth-Berechtigung; der Adapter prüft Zugangsdaten statt Sitzungen oder Administratorrechte aus Registrierung zu vergeben.

## Referenz

- [src/adapters/auth/local/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/local/manifest.json)
- [src/adapters/auth/local/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/local/package.json)
- [src/adapters/auth/local/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/local/index.ts)
