# Profil-Gateway

## Überblick

Das Profil-Gateway besitzt Benutzerprofile, den sozialen Graph, Beiträge und die Dateiverwaltung für Avatar- und Banner-Uploads. Es gibt jedem Cognis-Account eine öffentliche Identität und einen Platz im Community-Graph. Das Entfernen dieses Gateways entfernt alle Profil-, Social-, Post- und Dateifeatures von der Plattform, ohne Core, Auth oder andere Gateways zu beeinträchtigen.

## Verantwortlichkeiten

- Die Datenbanktabellen `account_profiles`, `account_follows`, `account_blocks`, `posts` besitzen und initialisieren.
- Account- und Post-Level-Sichtbarkeit auf allen Profil- und Sozial-Endpunkten durchsetzen.
- Den sozialen Graph verwalten: Folgen, Entfolgen, Blockieren, Entblocken, Follower/Following-Abfragen.
- Avatar- und Banner-Uploads über die `file:gateway`-Capability verwalten.
- `profile:createProfile`, `profile:setRoleByHandle` und `preferences:store` zum Capability-Store beitragen.

## Architektur

### Sichtbarkeitsmodell

| Stufe               | Profil sichtbar für             | Beiträge und Zahlen sichtbar für |
| ------------------- | ------------------------------- | -------------------------------- |
| `hidden` (Standard) | Nur Selbst und Admin            | — (Posten gibt 403 zurück)       |
| `private`           | Nur bestehende Follower         | Nur Follower                     |
| `friends`           | Jeder authentifizierte Benutzer | Nur Follower                     |
| `community`         | Jeder authentifizierte Benutzer | Jeder authentifizierte Benutzer  |

Beitrags-Sichtbarkeit (`only_me | private | friends | community`) ist immer durch die Account-Stufe begrenzt. Blockierte Aufrufer erhalten 404 auf jedem Endpunkt.

### Beigetragene Capabilities

| Capability                | Typ                                           | Beschreibung                                                              |
| ------------------------- | --------------------------------------------- | ------------------------------------------------------------------------- |
| `profile:createProfile`   | `(accountId, handle, role?) => Promise<void>` | Erstellt eine Profilzeile; wird von Auth bei der Registrierung aufgerufen |
| `profile:setRoleByHandle` | `(handle, role) => Promise<void>`             | Synchronisiert die Rolle in der Profilzeile                               |
| `preferences:store`       | `DbUserPreferenceStore`                       | Benutzerpräferenz-Persistenz                                              |

### Wichtige Quellen

| Pfad                                     | Zweck                                          |
| ---------------------------------------- | ---------------------------------------------- |
| `src/gateways/profile/bootstrap.ts`      | Bootstrap-Einstiegspunkt                       |
| `src/gateways/profile/routes/social.ts`  | Folgen, Blockieren, Follower-Routen            |
| `src/gateways/profile/routes/posts.ts`   | Beitrags-Erstellung, -Auflistung und -Löschung |
| `src/adapters/db/reuse/profile-store.ts` | `DbProfileStore` — alle Profil-SQL-Operationen |

## Direkte Profilaktualisierungen

Gespeicherte Profildaten werden sofort angezeigt. Die Zahlen und Benutzerkarten für Follower und Gefolgte werden automatisch aktualisiert. Für Profilbilder ist jeweils nur eine aktive Auswahl oder ein Upload möglich.

Änderungen beim Folgen und die Auswahl der Bannerhöhe werden sofort angezeigt, während die Synchronisierung im Hintergrund abgeschlossen wird.

Rückmeldungen zu Nachrichtenaktionen werden aus profileigenen Sprachressourcen geladen, sodass die Profildarstellung nicht von einem aktivierten Nachrichtenadapter abhängt.

## Verfügbarkeit

Das Profilmenü zeigt die aktuelle Verfügbarkeit und ermöglicht angemeldeten Benutzern die Auswahl zwischen Frei, Beschäftigt und Vorläufig. Statusleuchten an Avataren zeigen den ermittelten Status als Kurzinfo beim Darüberfahren. Andere Komponenten können den kalenderabhängigen Status eines Benutzers anhand der Konto-ID über die ctx-Fähigkeit `social:getUserAvailability` abfragen.

## Bereitgestellte UI-Capabilities

Das Profil-Navbar-Plugin stellt `ui:profileAvatarRenderer` bereit. Module, die Profilbilder darstellen, müssen diese ID in `requiresCapabilities` deklarieren; Cognis lädt den Anbieter dann vor dem Einhängen ihrer SPA-Routen.
