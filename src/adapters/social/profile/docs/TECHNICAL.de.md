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

Der eigenständige Profilanbieter stellt `ui:profileAvatarRenderer` bereit. Module, die Profilbilder darstellen, müssen diese ID in `requiresCapabilities` deklarieren; Cognis lädt den Anbieter dann vor dem Einhängen ihrer SPA-Routen.

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

### Bestätigte Kontolöschung

In `deprovision-user` → `cleanup-dependencies` löst die Komponente `auth:deprovisionOutcome` Version 1 über `system:contracts` auf und ruft `deletedAccount(input, stageResults)` mit den Originalobjekten desselben Aufrufs auf. Nur eine Auth-eigene Bestätigung der dauerhaft ausgeführten Löschung berechtigt dazu, Profil, soziale Aktivitäten und Einstellungen des Kontos zu entfernen. Kopierte Ergebnisse, Deaktivierungs- oder Archivierungsergebnisse sowie fehlende oder nicht verfügbare Bestätigungen berechtigen nicht zu dieser Bereinigung.

### Profiländerungen wiederholen

Profil bearbeiten bleibt mit den exakt eingegebenen Feldern geöffnet, bis der Server die Speicherung bestätigt oder der kontogebundene Offline-Puffer sie dauerhaft angenommen hat. Eine abgelehnte Anfrage, unlesbare Antwort oder fehlgeschlagene Puffer-Schreiboperation zeigt einen Fehler und aktiviert Speichern erneut, ohne den Entwurf zu verwerfen. Wiederholtes Speichern und die Eingabetaste senden nur eine laufende Anfrage; die Felder sind währenddessen deaktiviert. Optionale Fehler beim Aktualisieren von Karten, Navigationsleiste oder lokalem Anzeigenamen machen eine angenommene Speicherung nicht rückgängig.

Verwerfen, Schließen, Escape und der Hintergrund verwenden die gemeinsame Bestätigung für ungespeicherte Änderungen. Abbrechen in der Bestätigung behält das Formular. Bestätigtes Verwerfen schließt es und ignoriert spätere Rückmeldungen. Schließen kann eine bereits gesendete Anfrage nicht rückgängig machen; ein Hinweis weist darauf hin. Ein Speicherergebnis wartet vor der Seitenaktualisierung auf eine offene Verwerfungsentscheidung. Navigation, erneutes Einbinden, Konto- oder Sitzungswechsel und das Schließen des Dialogs entziehen alten Rückmeldungen ihre Wirkung. Beim erneuten Öffnen wird das zuletzt angenommene Profil verwendet. Feld- und Beschriftungskennungen bleiben auch während der Schließanimation eindeutig. Nicht gesendete Entwürfe bleiben bei Navigation oder Neuladen nicht erhalten.

Der profileigene Editor nutzt den vorhandenen ctx-Ablauf `social:profile:request` und bewahrt die Feldvalidierung, die gemeinsame Fokusverwaltung und die Offline-Zustellrichtlinie. Synthetische DOM-Tests führen die echte Seiteneinbindung, den Dialog, den Formulargenerator und registrierte Anfrageabläufe mit kontrolliertem Transport und Speicher aus. Sie belegen weder das Layout im echten Browser noch das Server- oder Datenbankverhalten.

### Profilbilder erneut laden

Navigationsleiste und Profilvorschau behalten unveränderte Bilder bei unabhängigen Aktualisierungen bei. Vorübergehende Netzwerkfehler sowie HTTP 408, 425, 429 und 5xx sperren einen Bildschlüssel nicht dauerhaft. Die nächste ausdrückliche Aktualisierung oder Öffnung kann erneut laden; es gibt keinen Wiederholungszeitgeber. Bestätigte Löschung (404/410), verweigerter Zugriff (401/403), ausdrückliche Invalidierung, Konto- oder Tokenwechsel und das Entfernen des Anbieters entfernen das zugehörige Bild. Der Profilkopf verwendet die unten beschriebene seitengebundene Medienverwaltung.

Der eigenständige Anbieter besitzt `ui:profileAvatarRenderer` während seiner Laufzeit. `fetch(key)` liefert weiterhin eine URL oder null; `hydrate(container, { signal })` unterstützt optionalen Abbruch, und `invalidate(key)` leert einen Schlüssel (ohne Schlüssel alle). Der Cache ist an Konto, Zugriffstoken und Anbieter gebunden, bündelt parallele Abrufe und ist auf 128 Schlüssel begrenzt. Erfolgreiche und bestätigt negative Abrufe werden nach 60 Sekunden bei Bedarf erneut geprüft. Ein Inhaltsdigest bewahrt bei identischen Bytes dieselbe URL; geänderte Bytes erhalten eine neue. Verdrängung, Invalidierung und Beendigung geben Objekt-URLs frei. Entfernte Elemente werden nicht festgehalten.

Der Navigationsanbieter liefert `avatarState` (`available`, `missing`, `denied`, `retryable`, `invalid` oder `stale`), optional `avatarKey` und nur bei Erfolg `avatarBlobUrl`. `onAvatarError` verwirft genau diese URL; `signal` kennzeichnet das Ende der Anbieterlebensdauer. Nur ein ausdrücklich wiederholbarer Fehler darf ein Bild desselben Kontos, Tokens und Anbieters mit unverändertem oder noch unbekanntem Schlüssel erhalten. Unbekannte oder fehlende Zustände erlauben kein Bild; ungeklärte Berechtigung gilt nie als erfolgreicher Abruf. Host-Verbraucher und Profile 3.0.19 müssen gemeinsam ausgeliefert werden. Ein neuer Host mit altem Anbieter zeigt bis zur passenden Version Initialen.

Die Einführung zur Profilidentität erklärt weiterhin Profillinks und ihre Vorschau. Bedienelemente, Ablauf und Abschlusskennung bleiben unverändert.

Für abhängige Darstellungsanbieter stellt der Renderer außerdem den verbindlichen Bereitschaftswert `available` bereit und sendet beim Einhängen und Widerrufen sein eigenes Ereignis `cognis:profile-avatar-renderer-changed`. Beim Abbruch des Scopes wird der Wert bereits vor dem Entfernen der Capability falsch. Fehlgeschlagene Starts und Reaktivierungen nutzen denselben Benachrichtigungsweg. Die bloße Registrierung belegt keine Bereitschaft.

## Profilbilder

Die Profilseite behält unveränderte Avatar- und Banner-Bildelemente bei Aktualisierungen von Follower-Zahlen, Profildaten und anderen Karten. Eine ausdrückliche Synchronisierung prüft die Medien erneut. Bei Netzwerkfehlern oder HTTP 408, 425, 429 oder 5xx bleibt das aktuelle Bild für dasselbe Profil, dieselbe Sitzung und denselben Schlüssel erhalten. Eine sichtbare Fehlermeldung fordert zum erneuten Versuch auf; die Aktualisierung wird nicht als erfolgreich gemeldet. Identische Bilddaten behalten ihre URL, geänderte Daten erhalten eine neue.

Ein anderes Profil oder ein anderer Bildschlüssel, ein bestätigter leerer Schlüssel, eine bestätigte Löschung oder verweigerte beziehungsweise fehlende Medien (401/403/404/410) entfernen das bisherige Bild. Das Entfernen des Avatars lässt das Banner bestehen und umgekehrt. Navigation, erneutes Einhängen, Konto-, Token- oder Anbieterwechsel und die Deaktivierung des Anbieters beenden alte Vorgänge und geben deren Objekt-URLs frei. Verspätete Profildaten, Antwortinhalte, Bildabrufe, Zuschnitte, Uploads, Löschungen und Follower-Aktualisierungen können keine neuere Seite verändern. Eine Dateiauswahl gehört zu der Seite, auf der sie geöffnet wurde.

Der Profile-Client veröffentlicht `social:profilePageSignal` mit seiner Gültigkeitsdauer neben `social:profileRequest`. Der Profilkopf nutzt die registrierten Abläufe `social:profile:request` und `social:profileMedia:read`, eine auf zwei Bilder begrenzte Verwaltung und den gemeinsamen Profile-Prüfsummenleser. Nur Bildelemente werden abgeglichen; der übrige Profilkopf wird weiter aktualisiert. Die Verträge für Composer, Seitenrahmen, Navigationsleiste, Vorschau-Berechtigungen und Entwurfseditor gelten weiterhin. Seite und Anbieter von Profile 3.0.20 müssen gemeinsam bereitgestellt werden.

Regressionstests verwenden statische jsdom-Testdaten, die tatsächlichen Seitenexporte und registrierte Anfrage- und Anbieterlebenszyklen. Sie prüfen Elementidentität, URL-Freigabe, Fehlerbehebung und vertauschte Abschlussreihenfolgen. Sie belegen weder die Darstellung und Bilddekodierung im nativen Browser noch den ursprünglich gemeldeten Auslöser im Produktivbetrieb.

Im eigenen Profil öffnet Profil bearbeiten Ihre Angaben. Bei einem Speicherfehler bleiben Ihre Änderungen zum Korrigieren und erneuten Versuchen erhalten.

Profilfotos bleiben sichtbar, während Zahlen und Details aktualisiert werden. Öffnen Sie das Profil nach einem fehlgeschlagenen Bildabruf erneut; eine bestätigte Entfernung löscht nur das ausgewählte Bild. Der Identitätsschritt behält sein Ziel, seinen Ablauf und seine Abschlusskennung.

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
