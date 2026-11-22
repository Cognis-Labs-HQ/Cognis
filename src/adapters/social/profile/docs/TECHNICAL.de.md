# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Profile und Beiträge.

## Schnittstellen

### Beigetragene Capabilities

| Capability                | Typ                                           | Beschreibung                                                              |
| ------------------------- | --------------------------------------------- | ------------------------------------------------------------------------- |
| `profile:createProfile`   | `(accountId, handle, role?) => Promise<void>` | Erstellt eine Profilzeile; wird von Auth bei der Registrierung aufgerufen |
| `profile:setRoleByHandle` | `(handle, role) => Promise<void>`             | Synchronisiert die Rolle in der Profilzeile                               |
| `preferences:store`       | `DbUserPreferenceStore`                       | Benutzerpräferenz-Persistenz                                              |

### Bereitgestellte UI-Capabilities

Das Profil-Navbar-Plugin stellt `ui:profileAvatarRenderer` bereit. Module, die Profilbilder darstellen, müssen diese ID in `requiresCapabilities` deklarieren; Cognis lädt den Anbieter dann vor dem Einhängen ihrer SPA-Routen.

### Browserclient-Capability

`social:profileUiClient` wird vor dem Einhängen abhängiger Seiten von einem eigenständigen Profilanbieter bereitgestellt und bietet `getCurrentProfile()`, damit Browsermodule Profildaten über den Client des zuständigen Adapters beziehen.

## Konfiguration

### Bestätigte Einstellungskopien

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

## Verhalten

### Überblick

Das Profil-Gateway besitzt Benutzerprofile, den sozialen Graph, Beiträge und die Dateiverwaltung für Avatar- und Banner-Uploads. Es gibt jedem Cognis-Account eine öffentliche Identität und einen Platz im Community-Graph. Das Entfernen dieses Gateways entfernt alle Profil-, Social-, Post- und Dateifeatures von der Plattform, ohne Core, Auth oder andere Gateways zu beeinträchtigen.

### Verantwortlichkeiten

- Die Datenbanktabellen `account_profiles`, `account_follows`, `account_blocks`, `posts` besitzen und initialisieren.
- Account- und Post-Level-Sichtbarkeit auf allen Profil- und Sozial-Endpunkten durchsetzen.
- Den sozialen Graph verwalten: Folgen, Entfolgen, Blockieren, Entblocken, Follower/Following-Abfragen.
- Avatar- und Banner-Uploads über die `file:gateway`-Capability verwalten.
- `profile:createProfile`, `profile:setRoleByHandle` und `preferences:store` zum Capability-Store beitragen.

### Sichtbarkeitsmodell

| Stufe               | Profil sichtbar für             | Beiträge und Zahlen sichtbar für |
| ------------------- | ------------------------------- | -------------------------------- |
| `hidden` (Standard) | Nur Selbst und Admin            | — (Posten gibt 403 zurück)       |
| `private`           | Nur bestehende Follower         | Nur Follower                     |
| `friends`           | Jeder authentifizierte Benutzer | Nur Follower                     |
| `community`         | Jeder authentifizierte Benutzer | Jeder authentifizierte Benutzer  |

Beitrags-Sichtbarkeit (`only_me | private | friends | community`) ist immer durch die Account-Stufe begrenzt. Blockierte Aufrufer erhalten 404 auf jedem Endpunkt.

### Wichtige Quellen

| Pfad                                           | Zweck                                          |
| ---------------------------------------------- | ---------------------------------------------- |
| `src/adapters/social/profile/index.ts`         | Bootstrap-Einstiegspunkt                       |
| `src/adapters/social/profile/routes/social.ts` | Folgen, Blockieren, Follower-Routen            |
| `src/adapters/social/profile/routes/posts.ts`  | Beitrags-Erstellung, -Auflistung und -Löschung |
| `src/adapters/social/profile/store.ts`         | `DbProfileStore` — alle Profil-SQL-Operationen |

### Direkte Profilaktualisierungen

Gespeicherte Profildaten werden sofort angezeigt. Die Zahlen und Benutzerkarten für Follower und Gefolgte werden automatisch aktualisiert. Für Profilbilder ist jeweils nur eine aktive Auswahl oder ein Upload möglich.

Änderungen beim Folgen und die Auswahl der Bannerhöhe werden sofort angezeigt, während die Synchronisierung im Hintergrund abgeschlossen wird.

Rückmeldungen zu Nachrichtenaktionen werden aus profileigenen Sprachressourcen geladen, sodass die Profildarstellung nicht von einem aktivierten Nachrichtenadapter abhängt.

### Verfügbarkeit

Das Profilmenü zeigt die aktuelle Verfügbarkeit und ermöglicht angemeldeten Benutzern die Auswahl zwischen Frei, Beschäftigt und Vorläufig. Statusleuchten an Avataren zeigen den ermittelten Status als Kurzinfo beim Darüberfahren. Andere Komponenten können den kalenderabhängigen Status eines Benutzers anhand der Konto-ID über die ctx-Fähigkeit `social:getUserAvailability` abfragen.

### Externe Sichtbarkeit

`profile:applyExternalProfile` akzeptiert für `profileVisibility` die Werte `hidden`, `private`, `friends` oder `community`. Ein gültiger Wert wird nach der Profilerstellung oder Synchronisierung als Profilsichtbarkeit gespeichert; unbekannte Werte werden ignoriert.

### Unbekannte Verfügbarkeit ohne Abfragefehler

GET-Verfügbarkeit liefert für fehlende oder durch Privatsphäre geschützte Profile erfolgreich den Status unknown. Beide Fälle haben dieselbe Antwortstruktur und fragen weder manuelle Einstellungen noch Kalenderstatus ab. Bestehende Regeln für Besitzer, Blockierungen, Community, Freunde und private Profile gelten weiterhin; Änderungen erfordern den Besitzer. Avatar-Anzeigen zeigen unbekannt ohne wiederholte Nicht-gefunden-Fehler.

### Soziale Offline-Änderungen

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/adapters/social/messages/technical).

### Profilstart

Die Profilverfügbarkeit startet beim Einbinden des Anbieters, nachdem sein gepufferter Client registriert und die Avatar-Stile bereit sind. Der Import startet weder Anwesenheitsaufrufe noch Abfragen. Deaktivieren und fehlgeschlagenes Einbinden entfernen Abonnements, Seiten-Listener, Timer und zwischengespeicherte Verfügbarkeit; veraltete asynchrone Arbeit verändert keinen späteren Anbieterbereich. So entsteht beim Online-Start von Verwaltungsseiten kein Fehler `profile_client_unavailable`.

### Öffentliche Profilnamen

Öffentliche SSO-Profilnamen enthalten keinen Anbieternamensraum. Bestehende Namen mit Anbieterpräfix werden bei der Profilinitialisierung ersetzt; bei Kollisionen kommt ein zufälliges Suffix hinzu. Anbieterneutrale Namen bleiben stabil. Konto-IDs, Identitätszuordnungen, Beiträge und Beziehungen bleiben unverändert. Mit dem Profilnamen ändert sich die öffentliche Profil-URL. Anbieterdaten sowie E-Mail- und Anmeldeinformationen bleiben in der nur für Administratoren zugänglichen Benutzerverwaltung. Die aufklappbaren Kontodetails verwenden die gemeinsamen Bereichsstile und laden autorisierte Metadaten beim Öffnen.

### Kontodatenschutz und Schlüsselbund-Isolation

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/gateways/auth/technical).

### Plötzlicher Verbindungsverlust

Die Abfrage flüchtiger Präsenz- und Verfügbarkeitsdaten pausiert im Offline-Modus und setzt nach der Wiederherstellung fort. Manuelle Verfügbarkeitsänderungen werden weiterhin im Offline-Puffer gespeichert.

### Dauerhaft vorgemerkte Änderungen

Vorgemerkte Profiltexte, Beiträge und begrenzte Bild-Uploads behalten ihren abgeschlossenen Status bei Ansichtsfehlern. Profiltexte verwenden online die Serverantwort und offline eine ausdrückliche vorgemerkte Darstellung. Fehlgeschlagene Übermittlung erhält Entwürfe; ein Fehler beim anschließenden Aktualisieren fordert nicht zu doppelter Übermittlung auf.

### Offline-Arbeitsbereich

Offline-Profilzugriff erfordert einen vollständig vorbereiteten Schnappschuss des eigenen Profils: Text, Beiträge, Verbindungen, Einstellungen sowie begrenzte Avatar- und Bannerbilder. Fremde Profile sind auch bei vorhandenem Cache gesperrt.

### Profilbearbeitung und Rollen

Profilformulare verwenden die komponenteneigenen Grenzen für Anzeigename, Biografie, Ort und Webseite. Die Rollensynchronisierung ermittelt den öffentlichen Profilnamen anhand der unveränderlichen Konto-ID, bevor Rolle und Sichtbarkeit aktualisiert werden.

`profile:setRole(accountId, role)` → `Promise<void>`.

### Lesbare mobile Inhalte

Auf Telefonen und Tablets stehen Profilidentität, Beitragserstellung und Beiträge vor weiteren sozialen Bereichen. Lange Namen, Biografien und Beiträge passen sich der verfügbaren Breite an. Beim vollen Banner steht die Identität unter dem Bild; Felder und Entwürfe bleiben bei Größenänderungen erhalten.

Die Vorschau zeigt vor dem Veröffentlichen den aktuellen Titel und Text. Wechsle zurück zum Schreiben oder drehe das Gerät, ohne den Entwurf zu verlieren.

Veröffentlichte Beiträge erscheinen sofort; nach dem Löschen wird die Beitragsliste ohne Neuladen aktualisiert.

### Typisierte Speicherung und Routen

Profilrollen und Sichtbarkeitstypen entsprechen den gespeicherten Datensätzen, einschließlich Moderatoren sowie privater, Freundes- und Community-Sichtbarkeit. Einstellungsabfragen liefern den gespeicherten JSON-Text. Persistenztests verwenden eine profileigene strukturierte Datenbanknachbildung mit Rollback.

### Geltungsbereich der Anmeldung

Gemeinsames Verhalten: [Auth](/docs/gateways/auth/technical).

## Sicherheit

Profilzugriff beachtet Sichtbarkeit, Blockierungen und aktuelle Beziehungen. Eigene Änderungen benötigen die passende Identität; öffentliche Handles und Avatarvorschauen umgehen diese Prüfung nicht.

## Referenz

### Technische Spezifikation

| Seite / Bereich     | Anleitung            | Zugriff             |
| ------------------- | -------------------- | ------------------- |
| `^/profile(?:/\|$)` | Profile und Beiträge | Angemeldeter Nutzer |

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/adapters/social/messages/technical).

Identität, Beiträge und Kontoaktionen verwenden die gerenderten Profilbereiche, auch bei leerer Beitragsliste. Das Seitensignal besitzt die Lebensdauer der Anleitung.

Beiträge haben ein eigenes Listenziel, auch bei sichtbarem Editor. Sozialaktionen umfassen nur ihre Schaltflächen; die Vorschau entfällt bei fremden Profilen.

Identität und Sozialaktionen stehen vor den aufeinanderfolgenden Beitrags- und Vorschauschritten.

Die Anleitung folgt Identität, sozialen Aktionen, Beiträgen und Vorschau in dieser Reihenfolge. Geräteansicht und Veröffentlichung beschreibt [Profil](/docs/adapters/social/profile).
