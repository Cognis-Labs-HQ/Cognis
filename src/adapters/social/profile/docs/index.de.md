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

### Browserclient-Capability

`social:profileUiClient` wird vor dem Einhängen abhängiger Seiten von einem eigenständigen Profilanbieter bereitgestellt und bietet `getCurrentProfile()`, damit Browsermodule Profildaten über den Client des zuständigen Adapters beziehen.

## Externe Sichtbarkeit

`profile:applyExternalProfile` akzeptiert für `profileVisibility` die Werte `hidden`, `private`, `friends` oder `community`. Ein gültiger Wert wird nach der Profilerstellung oder Synchronisierung als Profilsichtbarkeit gespeichert; unbekannte Werte werden ignoriert.

## Unbekannte Verfügbarkeit ohne Abfragefehler

GET-Verfügbarkeit liefert für fehlende oder durch Privatsphäre geschützte Profile erfolgreich den Status unknown. Beide Fälle haben dieselbe Antwortstruktur und fragen weder manuelle Einstellungen noch Kalenderstatus ab. Bestehende Regeln für Besitzer, Blockierungen, Community, Freunde und private Profile gelten weiterhin; Änderungen erfordern den Besitzer. Avatar-Anzeigen zeigen unbekannt ohne wiederholte Nicht-gefunden-Fehler.

## Soziale Offline-Änderungen

Profile- und Messages-Anbieter registrieren lebenszyklusgebundene HTTP-Aktionen über ctx. Zuvor geladene Profile, Beiträge, Raumlisten und verschlüsselte Verläufe bleiben im bestätigten Tab verfügbar. Profiltexte, Verfügbarkeit, Folgen-/Blockieren-Zustände, Bannerlayout, Beitragserstellung/-löschung, verschlüsselte Nachrichten in bestehenden Räumen, endgültige Reaktionszustände und Lesebestätigungen nutzen den kontogebundenen Offline-Puffer. Spätere Online-Änderungen warten auf gepufferte Änderungen desselben Anbieters. Konto- oder Sitzungswechsel während Vorbereitung oder Pufferwartezeit brechen die Aktion ab. Nachrichten und Beiträge verwenden stabile `operationId`-UUIDs; geänderte oder kontofremde Wiederholungen werden abgelehnt. Nachrichtenwiederholungen erzeugen keine weiteren Benachrichtigungen. Lesebestätigungen behalten die ursprüngliche Lesezeit.

Chats werden vor dem Puffern verschlüsselt: Klartext, Raumschlüssel und Zugangsdaten gelangen nie in die Warteschlange. Profiltexte und Beiträge liegen im Browserspeicher des aktuellen Kontos. Avatar-/Bannerdateien bis 350.000 Binärbytes teilen sich den bestehenden Puffer mit 1 MB, 1.000 Einträgen und sieben Tagen Aufbewahrung; größere Bilder benötigen eine Verbindung. Ein voller Puffer meldet einen übersetzten Fehler; Nachrichten- und Beitragsentwürfe werden erst nach erfolgreicher dauerhafter Abgabe geleert. Die Grenzen gelten für den gesamten Puffer.

Änderungen bleiben bis zur Serverbestätigung ausstehend. Nachrichten zeigen den Wartestatus; Profil-, Beitrags- und Medienaktionen nutzen die übliche Warteschlangenmeldung. Schließen und Neuladen lösen die native Browserbestätigung für ungespeicherte Änderungen aus, solange das aktuelle Konto gepufferte Einträge hat, auch bei deaktivierten Anbietern. Nach Bestätigung oder Kontobereinigung entfällt die Warnung. Wortlaut und erforderliche vorherige Interaktion bestimmt der Browser. Einträge überstehen weiterhin Neuladen; die Warnung verwirft sie nicht.

Zwischengespeicherte soziale Inhalte bleiben tablokal und zustimmungspflichtig. Erstbesuche, privates Offline-Neuladen, Raumerstellung, Mitgliedschafts-/Schlüsselverwaltung, Anrufe und große Uploads benötigen eine Verbindung. Tippen und Anwesenheit sind flüchtig und werden nicht nachgesendet. Beim Übertragen wird die aktuelle Serverautorisierung geprüft; Offline-Daten können entfernte Sperren nicht erkennen. Die ToS-Zustimmung bleibt vor Zugriff und Übertragung erforderlich.

## Profilstart

Die Profilverfügbarkeit startet beim Einbinden des Anbieters, nachdem sein gepufferter Client registriert und die Avatar-Stile bereit sind. Der Import startet weder Anwesenheitsaufrufe noch Abfragen. Deaktivieren und fehlgeschlagenes Einbinden entfernen Abonnements, Seiten-Listener, Timer und zwischengespeicherte Verfügbarkeit; veraltete asynchrone Arbeit verändert keinen späteren Anbieterbereich. So entsteht beim Online-Start von Verwaltungsseiten kein Fehler `profile_client_unavailable`.

## Öffentliche Profilnamen

Öffentliche SSO-Profilnamen enthalten keinen Anbieternamensraum. Bestehende Namen mit Anbieterpräfix werden bei der Profilinitialisierung ersetzt; bei Kollisionen kommt ein zufälliges Suffix hinzu. Anbieterneutrale Namen bleiben stabil. Konto-IDs, Identitätszuordnungen, Beiträge und Beziehungen bleiben unverändert. Mit dem Profilnamen ändert sich die öffentliche Profil-URL. Anbieterdaten sowie E-Mail- und Anmeldeinformationen bleiben in der nur für Administratoren zugänglichen Benutzerverwaltung. Die aufklappbaren Kontodetails verwenden die gemeinsamen Bereichsstile und laden autorisierte Metadaten beim Öffnen.

## Kontodatenschutz und Schlüsselbund-Isolation

SSO-Konten erhalten zufällige undurchsichtige IDs. Anbieter-IDs werden separat gespeichert und nur Administratoren angezeigt; öffentliche Benutzernamen enthalten sie nie. Auth reserviert Benutzernamen vor Profil- oder E-Mail-Änderungen: doppelte Namen desselben Anbieters werden abgelehnt, bei verschiedenen Anbietern wird bei Bedarf ein kurzes Zufallssuffix ergänzt. Benutzerlisten und Aktionsendpunkte unterscheiden den öffentlichen `username` von der internen `accountId`.

Vorhandene lokale Konten funktionieren auch bei vorhandenen alten SSO-Datensätzen weiter. Der Start erfordert kein Zurücksetzen der Datenbank. Anmeldung und Bereitstellung alter SSO-Konten werden einzeln abgelehnt, bis diese Konten mit undurchsichtigen IDs neu erstellt wurden. Konto-IDs, Beziehungen und Besprechungen werden weder automatisch migriert noch gelöscht.

## Plötzlicher Verbindungsverlust

Die Abfrage flüchtiger Präsenz- und Verfügbarkeitsdaten pausiert im Offline-Modus und setzt nach der Wiederherstellung fort. Manuelle Verfügbarkeitsänderungen werden weiterhin im Offline-Puffer gespeichert.

## Dauerhaft vorgemerkte Änderungen

Vorgemerkte Profiltexte, Beiträge und begrenzte Bild-Uploads behalten ihren abgeschlossenen Status bei Ansichtsfehlern. Profiltexte verwenden online die Serverantwort und offline eine ausdrückliche vorgemerkte Darstellung. Fehlgeschlagene Übermittlung erhält Entwürfe; ein Fehler beim anschließenden Aktualisieren fordert nicht zu doppelter Übermittlung auf.

## Offline-Arbeitsbereich

Offline-Profilzugriff erfordert einen vollständig vorbereiteten Schnappschuss des eigenen Profils: Text, Beiträge, Verbindungen, Einstellungen sowie begrenzte Avatar- und Bannerbilder. Fremde Profile sind auch bei vorhandenem Cache gesperrt.

## Bestätigte Einstellungskopien

Erfolgreiche Profile-Einstellungsschreibvorgänge aktualisieren vor weiteren Lesezugriffen ihre begrenzte, anbietereigene Lesekopie, auch bei erneuter Übertragung und reinem Online-Speichern. Offline-Zusammenführungen behalten bestätigte Felder und berücksichtigen verbleibende Änderungen. Verzögerte Lesezugriffe überschreiben keine neueren bestätigten Daten; Kontowechsel, Anbieterabbau und fehlgeschlagene Schreibvorgänge veröffentlichen keine veralteten Daten.

## Profilbearbeitung und Rollen

Profilformulare verwenden die komponenteneigenen Grenzen für Anzeigename, Biografie, Ort und Webseite. Die Rollensynchronisierung ermittelt den öffentlichen Profilnamen anhand der unveränderlichen Konto-ID, bevor Rolle und Sichtbarkeit aktualisiert werden.

`profile:setRole(accountId, role)` → `Promise<void>`.
