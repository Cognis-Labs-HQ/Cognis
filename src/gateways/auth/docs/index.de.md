# Authentifizierungs-Gateway

## Überblick

Das Authentifizierungs-Gateway ist der zentrale Eingangspunkt für alle Anmelde- und Identitätsoperationen in Cognis. Es entkoppelt den Rest der Plattform von einem bestimmten Authentifizierungsanbieter, indem es sich zwischen Route-Handler und die konkreten Auth-Adapter stellt. Der Wechsel des Authentifizierungsanbieters — von lokalen Passwörtern zu LDAP oder SAML — erfordert nur das Aktivieren des neuen Adapters über die Admin-API; kein Route-Handler oder Core-Service muss geändert werden.

Das Gateway entdeckt Adapter durch Scannen von `src/adapters/auth/` beim Bootstrap. Jedes Adapterverzeichnis muss eine `createAdapter()`-Funktion exportieren. Der lokale Adapter wird immer zuerst geladen und besonders behandelt, da er die `user:*`-CLI-Befehle und den ersten Admin-Account-Erstellungsfluss unterstützt. Alle anderen Adapter werden aus ihren Verzeichnissen geladen und können zur Laufzeit durch einen Admin ohne Serverneustart aktiviert oder deaktiviert werden.

## Verantwortlichkeiten

- Alle Auth-Adapter aus `src/adapters/auth/` beim Bootstrap entdecken und registrieren.
- Adapter-Aktivierungsstatus in `auth_adapter_configs` verwalten und persistieren.
- Anmeldedaten durch Delegierung an den aktivierten Adapter für den angeforderten Anbieter verifizieren.
- Zugriffstoken nach erfolgreicher Authentifizierung über `issueAccessToken` ausstellen.
- Den dokumentierten Capability-Satz beitragen: `auth:accountStore`, `auth:createLocalAdmin`, `auth:getLoginMethods`, `auth:registerProvider`, `auth:registerLoginButton`, `auth:registerPageScriptOrigins`, `auth:issueAccessToken`, `auth:getAuthClaims`, `auth:requireAuth`, `auth:requireRoleAccess`, `auth:revokeAccessTokensForSubject`, `auth:revokeSetupPendingAccessTokens` und `auth:routeContext`.
- Alle Auth-API-Routen und Adapter-Admin-Routen registrieren.

Nicht verantwortlich für: Benutzerprofile speichern (das ist das Profil-Gateway), Session-Management über die Token-Ausstellung hinaus, oder nicht-auth-bezogene Geschäftslogik.

### Lebenszyklus von Laufzeitanbietern

Laufzeitanbieter müssen wie LDAP das Authentication-Gateway als Autorität für Konfiguration und Aktivierungszustand verwenden. Der Anbieter stellt eine stabile `id`, `getConfigSchema()`, `configure(config)` und `isConfigured()` bereit; die Administration liest und schreibt `/api/v1/gateways/auth/adapters/<id>/config` und schaltet über `/enable` oder `/disable`. Das Modul darf keinen zweiten Aktivierungsstatus verwalten und die Modulaktivierung nicht mit der Adapteraktivierung gleichsetzen.

Beim Bootstrap muss `auth:registerProvider(provider, requires)` abgewartet werden, bevor Routen oder Anmeldedarstellung registriert werden. Das Promise wird erst aufgelöst, nachdem Cognis die gespeicherte Konfiguration und den Aktivierungszustand des Adapters wiederhergestellt hat. Anschließend wird die markenspezifische Schaltfläche registriert; beide Bereinigungsfunktionen werden aufbewahrt, und beim Abbau wird die Schaltfläche vor dem Anbieter entfernt. Ein Anbieter ohne gespeicherten aktivierten Zustand startet deaktiviert und muss die Einrichtung über den Gateway-eigenen Adapterkonfigurationsablauf abschließen.

## Architektur

Die zentrale Klasse ist `CoreAuthGateway` in `src/gateways/auth/gateway.ts`. Sie hält eine Map registrierter Adapter, eine Menge aktivierter Adapter-IDs und eine Referenz auf den lokalen Adapter (der separat über `setLocalAdapter()` verkabelt wird).

```ts
export class CoreAuthGateway {
  registerAdapter(adapter: AuthProviderAdapter, requires?: string[]): () => boolean;
  setLocalAdapter(adapter: AuthProviderAdapter & { ... }): void;
  async discoverAdapters(authAdaptersRoot: string): Promise<void>;
  async loadPersistedConfigs(): Promise<void>;
  async getEnabledAdapter(id: string): Promise<AuthProviderAdapter | null>;
  async getAdapter(): Promise<AuthProviderAdapter | null>;
  async authenticate(credentials: Record<string, unknown>, providerId?: string): Promise<AuthContext | null>;
  async createLocalAdmin(username: string, password: string): Promise<AuthContext>;
  async getLoginMethods(): Promise<AdapterInfo[]>;
}
```

`getEnabledAdapter(id)` gibt einen bestimmten Adapter per ID nur zurück, wenn er aktuell aktiviert ist. `getAdapter()` (ohne Argument) gibt den ersten aktivierten Adapter zurück. Beide geben `null` zurück, wenn kein geeigneter Adapter gefunden wird.

`registerAdapter()` gibt die Bereinigungsfunktion des Anbieters zurück, die von Modul-Disposern verwendet wird. Ihr Aufruf entfernt genau diese Anbieterregistrierung samt Aktivierungsstatus und Abhängigkeitsmetadaten. Wurde dieselbe ID inzwischen durch einen anderen Anbieter ersetzt, bleibt dieser erhalten. Diese Bereinigung ist erforderlich, da beim Deaktivieren eines Moduls alle von ihm beigetragenen Fähigkeiten entfernt werden müssen.

Bootstrap in `src/gateways/auth/bootstrap.ts` und `src/gateways/auth/bootstrap/`:

1. Instanziiert `DbLocalAccountStore` aus `src/adapters/auth/local/store.ts`.
2. Instanziiert `CoreAuthGateway` mit dem DB-Executor und -Typ.
3. Lädt den lokalen Adapter über `setLocalAdapter()`.
4. Ruft `discoverAdapters(authAdaptersRoot)` auf, um alle anderen Adapter zu laden.
5. Ruft `loadPersistedConfigs()` auf, um den Aktivierungsstatus aus der Datenbank wiederherzustellen.
6. Führt Capability-/Bootstrap-Hooks aus `src/gateways/auth/bootstrap/` aus.
7. Registriert Routen und Capabilities.

Beigetragene Capabilities:

| Capability                       | Typ                                            | Beschreibung                                                                                                       |
| -------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `auth:accountStore`              | `LocalAccountStore`                            | Lokaler Account-Store, der vom lokalen Adapter verwendet wird                                                      |
| `auth:createLocalAdmin`          | `(username, password) => Promise<AuthContext>` | Erstellt einen Admin-Account, wenn er nicht existiert                                                              |
| `auth:getLoginMethods`           | `() => Promise<AdapterInfo[]>`                 | Gibt Metadaten für alle aktivierten Anbieter zurück                                                                |
| `auth:registerProvider`          | `async (provider, requires?) => dispose`       | Registriert einen Modul-Authentifizierungsanbieter und gibt seine Bereinigungsfunktion zurück                      |
| `auth:registerLoginButton`       | `(descriptor) => dispose`                      | Registriert die Darstellung einer markenspezifischen Anmeldeschaltfläche und gibt ihre Bereinigungsfunktion zurück |
| `auth:registerPageScriptOrigins` | `(ownerId, origins) => string[]`               | Ersetzt vertrauenswürdige http(s)-Skriptursprünge für einen Besitzer in Seiten-CSP-Headern                         |

Authentifizierungsanbieter müssen `auth:registerProvider` abwarten, bevor sie `auth:registerLoginButton` aufrufen. Die Registrierung stellt die gespeicherte Konfiguration und den Aktivierungszustand des Adapters vor dem Abschluss wieder her und entspricht damit dateisystembasierten Anbietern wie LDAP. Der Deskriptor erfordert die registrierte `providerId`, ein vollständig lokalisiertes `label` und eine gleichursprüngliche `iconUrl`. Optionale Werte für `backgroundColor`, `borderColor` und `textColor` verwenden sechsstellige Hexadezimalfarben. Die Anmeldeseite zeigt sowohl in kompakten als auch in breiten Ansichten immer das Symbol und die vollständige Beschriftung. Anbieter müssen die zurückgegebene Bereinigungsfunktion aufrufen, wenn ihr Beitrag deaktiviert wird. Nicht gestaltete Methoden ohne Anmeldedaten werden ausgelassen, anstatt als generische Anmeldeschaltflächen dargestellt zu werden.

Browserseitige OAuth-Weiterleitungen können `/sso/<routeNamespace>/<path>` verwenden. Cognis leitet Rückrufe mit Abfrageparametern direkt an den Anbieter weiter und überführt fragmentbasierte Antworten in denselben serverseitigen Rückruf, ohne dass die Ladeanzeige dauerhaft aktiv bleibt. Bei Rückruffehlern wird mit einer lokalisierten Fehlermeldung zur Anmeldung zurückgekehrt.

Ein Anbieter kann `routeNamespace` und `registerRoutes(router)` in seinem Adapter deklarieren. Der Router akzeptiert `GET`- und `POST`-Pfade relativ zu `/api/v1/auth/<routeNamespace>`, sodass OAuth-Rückrufe unter dem Authentifizierungs-Gateway liegen können, ohne dem beitragenden Modul direkten Zugriff auf geschützte Core-Routen zu geben. Namespaces sind auf sichere URL-Segmente beschränkt, Core-Authentifizierungs-Namespaces sind reserviert, doppelte Routen werden abgelehnt und beim Entfernen des Anbieters werden alle beigetragenen Routen entfernt.

Sitzungen externer Anbieter durchlaufen `gateAccountCreation` vor `ensureExternalAccount`. Ein aktivierter öffentlicher Registrierungsadapter erlaubt die Bereitstellung von SSO-Konten unabhängig von der Richtlinie für öffentliche lokale Registrierung. Andernfalls speichert Cognis eine unbekannte authentifizierte Identität hinter einer undurchsichtigen, ablaufenden Vorgangs-ID und gibt `account_creation_required` mit einer `registrationUrl` zurück. Anbieter leiten zu dieser URL weiter. Der Registrierungstoken-Adapter ergänzt die Autorisierung in der standardmäßigen Registrierungshülle und setzt die angehaltene Identität fort, ohne Rückrufdaten des Anbieters offenzulegen.

## API-Routen

| Methode | Pfad                                         | Beschreibung                                             | Authentifizierung |
| ------- | -------------------------------------------- | -------------------------------------------------------- | ----------------- |
| `GET`   | `/api/v1/auth/login-methods`                 | Aktivierte Authentifizierungsanbieter auflisten          | Keine             |
| `POST`  | `/api/v1/auth/register`                      | Neuen lokalen Account selbst registrieren                | Keine             |
| `POST`  | `/api/v1/auth/login`                         | Authentifizieren; gibt Bearer-Token zurück               | Keine             |
| `POST`  | `/api/v1/auth/sso/start`                     | Autorisierungsumleitung eines externen Anbieters starten | Keine             |
| `POST`  | `/api/v1/auth/verify`                        | Passwort des aktuellen Benutzers verifizieren            | Benutzer          |
| `GET`   | `/api/v1/gateways/auth/adapters`             | Alle registrierten Auth-Adapter auflisten                | Admin             |
| `GET`   | `/api/v1/gateways/auth/adapters/:id/config`  | Konfig-Schema für einen Adapter abrufen                  | Admin             |
| `PUT`   | `/api/v1/gateways/auth/adapters/:id/config`  | Konfig für einen Adapter aktualisieren                   | Admin             |
| `POST`  | `/api/v1/gateways/auth/adapters/:id/test`    | Adapterkonfiguration testen                              | Admin             |
| `POST`  | `/api/v1/gateways/auth/adapters/:id/enable`  | Adapter aktivieren                                       | Admin             |
| `POST`  | `/api/v1/gateways/auth/adapters/:id/disable` | Adapter deaktivieren                                     | Admin             |

Fehler bei Adaptertests können ein Objekt `error.fieldErrors` enthalten, das beliebig viele Konfigurationsfeld-IDs sicheren Diagnosemeldungen zuordnet.

Adapterlisten und Konfigurationsverträge enthalten `stringsBaseUrl`, wenn ein Adapter lokalisierte Administrationsressourcen besitzt.

## Browser-Schlüsselbundstart

Das Authentifizierungs-Gateway lädt seinen erforderlichen Schlüsselbundadapter, bevor es die Browser-Sitzungs-Flow-Hooks registriert. Dadurch kann jeder direkte Seitenaufruf und jede Aktualisierung den nicht exportierbaren Sitzungsschlüssel des aktuellen Tabs automatisch wiederherstellen. Ist die Wiederherstellung nicht verfügbar, öffnet die erste Auflösung geschützter Inhalte den kontextbezogenen Entsperrdialog.

## Weitergabe von Freigabefehlern

Browser-Sitzungsergebnisse bewahren einen neutralen Fehlergrund der alternativen Authentifizierung, damit eine öffentliche Ressourcenseite eine fehlende Ressource von anderen Nicht-verfügbar-Zuständen unterscheiden kann, ohne Authentifizierungs-Interna zu importieren.

Änderungen an Authentifizierungsquellen führen nach der Speicherung den Ablauf `reconcile-auth-sources` aus. Adapter-Hooks nutzen dessen Stufe `reconcile-accounts`, um Sitzungen zu widerrufen und quelleneigene Identitäten ohne anbieterspezifische Routenverzweigungen abzugleichen.

## Grenzen der Browsersitzung

Die Ungültigmachung der Passwortbestätigung wird nur für eine authentifizierte vollständige Kontositzung ausgeführt. Anonyme Seiten und Share-Gastseiten können den Schlüsselbund sperren oder ersetzen, ohne eine nur für Konten bestimmte Anfrage `DELETE /api/v1/auth/verify` zu senden.

## Externe Profilanbieter

SSO-Module können `auth:registerExternalProfileProvider` über CTX registrieren. Der Resolver erhält Anbieter-ID, Cognis-Konto-ID, externe Benutzer-ID und authentifizierte Anbietersitzung und kann einen durchsuchbaren Benutzernamen, Anzeigename, Biografie, Ort, Website sowie Avatar- und Bannerdaten zurückgeben. Cognis verwendet außerdem einen in der Anbietersitzung gelieferten `handle` oder `username` als anfänglichen Profilnamen, statt eine undurchsichtige externe Konto-ID als Benutzernamen anzuzeigen. Der Profiladapter speichert diese Daten bei der ersten Erstellung des externen Kontos über seine eigenen Speicherfunktionen. Ein gültiger `profileVisibility`-Wert (`hidden`, `private`, `friends` oder `community`) wird als Sichtbarkeit des neuen Profils gespeichert.

### Synchronisierung externer Profile

Eine externe Authentifizierungsintegration kann die CTX-Abfrage `auth:syncExternalProfile` bereitstellen. Sie akzeptiert `{ providerId }` für das authentifizierte Konto, aktualisiert das anbieterseitige Profil über `auth:resolveExternalProfile` und wird erst abgeschlossen, nachdem Cognis Benutzername, Anzeigefelder, Avatar-Daten und Banner-Daten über die Profil- und Dateifunktionen gespeichert hat. Bild-URLs des Anbieters sind nur Eingaben für die Integration; die Abfrage muss Mediendaten zurückgeben, damit Browseroberflächen stets Cognis-eigene Dateien darstellen. Im Browser ruft eine Integration `auth:registerExternalProfileSynchronizer` mit ihrer Anbieter-ID und Synchronisierungsfunktion auf. Das Authentifizierungsregister zeigt die Aktion nur für den aktuellen Anbieter an, sodass keine andere installierte Integration das falsche Kontoprofil verarbeiten oder überschreiben kann.

### Gelöschte externe Identitäten

Beim Löschen eines extern authentifizierten Kontos wird vor dem Entfernen der kontoeigenen Daten ein nicht umkehrbarer Fingerabdruck seiner Anbieteridentität gespeichert. Eine spätere erfolgreiche Anbieterauthentifizierung entfernt diesen Löschvermerk transaktional während der Neuerstellung des Kontos und entspricht damit dem Verhalten verzeichnisgestützter Authentifizierung. Fehlgeschlagene Authentifizierung kann den Vermerk nicht entfernen, und der Fingerabdruck wird Browser-Clients nicht offengelegt.

### Anbieterbezogene Kontonamen

Neue externe Konten verwenden den Anbieter-Namensraum sowohl im lokalen Kontoschlüssel als auch im Profilnamen. Eine Anbietersitzung für den Namen `firehawksystems` mit `accountNamespace` auf `x` wird daher zu `x:firehawksystems`; ein lokales Konto `firehawksystems` und Identitäten wie `line:firehawksystems` bleiben getrennt. Bestehende Zuordnungen aus `(provider, external_user_id)` bleiben bei späteren Anmeldungen maßgeblich, auch wenn sich ein Anbietername ändert.

## Medienrichtlinie im Browser

Authentifizierte Seiten erlauben Medien aus gleichursprünglichen Routen und browsererzeugten `blob:`-URLs. Vertrauenswürdige UI-Clients können dadurch authentifizierte Audioantworten wiedergeben, ohne beliebige externe Medienquellen zuzulassen.

### Modul-Lebenszyklus

`auth:registerKeyringDataOwner(ownerId, purge)` ist eine öffentliche Serverfähigkeit. Doppelte Eigentümer-IDs werden abgelehnt; zurückgegeben wird ein identitätsgeprüfter Disposer. Module verwenden `module:<id>` und registrieren die Bereinigung mit `ctx.registerDisposer`; purge erhält die normalisierte Konto-ID. Nur Keyring-abhängigen Zustand bereinigen, Kontenidentität und fremde gemeinsame Ressourcen erhalten.

## Sitzungseinrichtung

Jede authentifizierte Sitzung prüft `/api/v1/auth/setup-status`, auch nach SSO. Auth besitzt `auth:getSetupIntegrations(accountId, role)` und wertet den registrierten Prüfmodus aus. Der Anbieter liefert Skripte desselben Ursprungs mit `enforceSetup({ accountId })`. Einrichtung endet vor Navigation oder Offline-Nutzung; fehlende Verfügbarkeit hebt die Richtlinie nicht auf. Die Wiederherstellung durch den Gründeradministrator bleibt ausgenommen.

## Ladeanzeige bei Anmeldung

Anfragen für Zugangsdaten, TFA-Codes und SSO-Autorisierung zeigen das gemeinsame Laderad und blenden es vor interaktiver Einrichtung aus. Doppelte Anmeldungen werden während einer laufenden Anfrage ignoriert. Öffentliche Offline-Caches werden nach der Anmeldung im Hintergrund bereinigt und aktualisiert. Der letzte Anmeldezeitpunkt wird auch für SSO bei deaktiviertem lokalem Authentifizierungsadapter erfasst.

## Kontodatenschutz und Schlüsselbund-Isolation

SSO-Konten erhalten zufällige undurchsichtige IDs. Anbieter-IDs werden separat gespeichert und nur Administratoren angezeigt; öffentliche Benutzernamen enthalten sie nie. Auth reserviert Benutzernamen vor Profil- oder E-Mail-Änderungen: doppelte Namen desselben Anbieters werden abgelehnt, bei verschiedenen Anbietern wird bei Bedarf ein kurzes Zufallssuffix ergänzt. Benutzerlisten und Aktionsendpunkte unterscheiden den öffentlichen `username` von der internen `accountId`.

Vorhandene lokale Konten funktionieren auch bei vorhandenen alten SSO-Datensätzen weiter. Der Start erfordert kein Zurücksetzen der Datenbank. Anmeldung und Bereitstellung alter SSO-Konten werden einzeln abgelehnt, bis diese Konten mit undurchsichtigen IDs neu erstellt wurden. Konto-IDs, Beziehungen und Besprechungen werden weder automatisch migriert noch gelöscht.

## Anmeldung und Übertragung

Nach erfolgreicher Passwort- oder TFA-Anmeldung ersetzt die vorhandene SPA-Navigationsfunktion die Anmeldeseite durch das Dashboard. Der bestätigte Tab und gepufferte Arbeit bleiben dadurch erhalten, ohne die Schließwarnung des Browsers auszulösen. Die Ladeanzeige bleibt bis zum Abschluss der Navigation sichtbar; die optionale Zeitzonensynchronisierung folgt danach und verwirft Kontowechsel. Tatsächlich gepufferte Änderungen bleiben beim Schließen oder Neuladen eines authentifizierten Tabs durch die Warnung geschützt.

## Sitzungs- und Modulgrenzen

Auth veröffentlicht `session:isOfflineValid` als synchrone, netzwerkfreie Instanz für bestätigten Offline-Zugriff. Geprüft werden abgeschlossene Einrichtung, aktuelles Konto und Token sowie der Sitzungsablauf. Warteschlangen verwenden diesen Vertrag statt eigener Auswertung des Auth-Speichers. Die Kontoeinrichtung überspringt alternative Gastsitzungen. Der Server-Endpunkt setup-status verwendet Shares Klassifizierungsfähigkeit vor TFA- oder E-Mail-Integrationen. Für normale lokale und SSO-Konten bleibt die vorgeschriebene Einrichtung verbindlich.

## Kontogebundene Warteschlangen

Gepufferte Einträge enthalten die vom Server bestätigte Kontoinstanzkennung. Auth liefert die kanonische `accountInstanceId` im authentifizierten Einrichtungsstatus und veröffentlicht `session:getOfflineIdentity` nur für bestätigte, vollständig eingerichtete und nicht abgelaufene Kontositzungen. Fehlende verbindliche Metadaten widerrufen die Offline-Berechtigung. Warteschlangenansichten sowie Speicher- und Zustellungsprüfungen sind an diese Instanz gebunden. Einträge alter oder unbestätigter Instanzen werden vor der Übertragung abgewiesen, auch wenn ein lokales Konto mit derselben Konto-ID neu erstellt wurde. Vorgangskennungen können nicht zwischen Kontoinstanzen kollidieren. Bearer-Token werden niemals in der Warteschlange gespeichert.

## Begrenzte SSO-Registrierungsversuche

Einladungspflichtige SSO-Identitäten werden vor dem Anlegen von Konto, Profil oder E-Mail zurückgehalten. Abgebrochene oder abgelaufene Versuche können nicht fortgesetzt werden; Registrierung und Zwei-Faktor-Anmeldung laufen exakt zur Frist ab. Der aktivierte öffentliche Registrierungsadapter erlaubt weiterhin SSO-Kontoerstellung unabhängig von öffentlicher nativer Registrierung. Bestehende Konten werden nicht anhand von Anbieter oder Alter gelöscht.

## Registrierte Kontoprüfungen

`auth:userValidationModes.register` erhält Kennung, übersetzte Beschriftung, optionale Ressourcenbasis, erforderliche Registrierungsfelder, Verfügbarkeitsfunktion, Prüffunktion und optionale Einrichtung. Registrierung ist nur beim Bootstrap möglich und an den Lebenszyklus des Besitzers gebunden. Auth prüft die gewählte Funktion durch `auth:evaluateUserValidation` (`resolvePolicy`, `validateAccount`, `verifyResult`), ohne Methodenkennungen fest einzubauen. Fehlende oder nicht verfügbare konfigurierte Richtlinien verweigern den Zugriff. Die Wiederherstellung durch den Gründeradministrator bleibt ausgenommen. Administration zeigt registrierte Metadaten; eine gespeicherte nicht verfügbare Auswahl bleibt erhalten.

Die Vertragsregistrierung von Adaptern folgt dem [gemeinsamen Gateway-Bootstrap-Vertrag](/docs/gateways).

## Abgesicherter Sitzungsstart

Die Auth-eigene Fähigkeit `auth:login` der Version 1 führt `auth:prepareLogin` (`authenticate`, `assessSession`, `authorizeSession`) aus und ruft dann `auth:completeSession` auf. Der primäre Ablauf `login` liefert Vorbereitungsdaten mit `authenticated`, niemals ein gewöhnliches Token; erforderliche Kontometadaten werden weiterhin angelegt. Für abgeschlossene Anmeldungen muss die Fähigkeit statt eines rohen Ablaufs aufgerufen werden. Produktionsroute und registrierte Ablaufprüfungen verwenden diese Grenze; TFA-Prüfung und Einrichtung rufen die Abschlussfähigkeit auf. Bestehende primäre Erweiterungen enden vor Prüfung und Abschluss.

`auth:completeSession` ist eine vertrauenswürdige Server-Fähigkeit der Version 1. Die nur lesenden Stufen von `auth:prepareSession` (`validateAccount`, `validateLifecycle`, `authorizeSession`) prüfen Kontofreigabe und optionalen Profilstatus. Beide Vorbereitungsabläufe beachten zurückgegebene und in Daten gespeicherte Ablehnungen sowie Ausnahmen vor der Aktivierung. Nach allen Erweiterungen aktiviert Auth das Profil und stellt je Konto serialisiert die Sitzung aus; danach gibt es keinen Richtlinien-Hook. Fehler eines vorhandenen Profildienstes ergeben `session_unavailable`; fehlende Profile bleiben erlaubt. Letzte Anmeldung und Token folgen erst nach erfolgreicher Prüfung. Die Sicherheit stammt aus besitzereigenen Versuchen und Faktorprüfungen, niemals aus Abschlussfeldern der Anfrage. Lebenszyklusprüfungen sperren veraltete Arbeit. Fehlgeschlagene Abschlüsse widerrufen nur ihre eigenen gewöhnlichen Tokens. Speicheroperationen über Komponentengrenzen sind nicht atomar: Eine Aktivierung kann nach erfolgreicher Prüfung bestehen bleiben, wenn ein abschließender Schreibvorgang erst speichert und dann fehlschlägt oder ein späterer Abschlussschritt scheitert. Fremde Profiländerungen werden nicht zurückgesetzt. Ausstehende, ungültige oder abgebrochene Faktoren aktivieren keine Profile und hinterlassen keine gewöhnlichen Tokens.

TFA stellt `tfa:assessSession` als Fähigkeit der Version 1 mit eigenem gestuftem Ablauf bereit. Ein bekannter aktiver TFA-Gateway ohne funktionierende Prüfung sperrt die Anmeldung. Bewusst nicht vorhandene oder administrativ deaktivierte TFA bleibt optional. Gespeicherte aktive Einrichtung bleibt bei Anbieterausfällen erforderlich; Wiederherstellungscodes bleiben verfügbar. Eine gespeicherte administrative Deaktivierung hebt diese Pflicht ausdrücklich auf. Fehler in optionalen Herausgebermetadaten entfernen keinen ansonsten gültigen Anbieter.

Faktorprüfung und Einrichtungsabschluss verwenden beide den Auth-eigenen Sitzungsabschluss. `auth:consumePendingLoginAttempt` verbraucht einen nicht abgelaufenen, primär authentifizierten Versuch nach erfolgreicher Faktorprüfung atomar. Gleichzeitige oder wiederholte Abschlüsse können ihn nicht erneut verwenden. Auch die Einrichtungsprüfung verhindert einen gleichzeitigen Abschluss derselben Einrichtung. Bei einem fehlgeschlagenen Abschluss werden weder gewöhnliches Token noch Cookie geliefert; nach Behebung erneut anmelden. Beim Bereinigen des Besitzers werden Prüf- und Abschlussabläufe sowie ausstehende Anmeldeversuche entfernt; veraltete laufende Arbeit wird sicher abgelehnt. Bedienelemente und Ablauf der bestehenden Tutorials bleiben gleich; nicht verfügbare Sitzungen zeigen übersetzte Fehlermeldungen.

## Typisierte Authentifizierungsgrenzen

Die Deklarationen von Auth und TFA beschreiben die bestehenden Kontorollen, externen Identitätsfelder, Datenbankbefehle und Cookie-Sitzungsdaten. Die Prüfung des Sitzungslimits akzeptiert dieselben Zahlenwerte. Die Anmeldeabsicherung und einmalig verwendbare Faktorversuche bleiben unverändert.

## Eingeschränkte Zugangstoken

Das gespeicherte Tokenformat 2 verlangt explizite Sicherheitsfelder und verwirft nicht unterstützte Formate sowie ungültige oder mehrdeutige Datensätze. Abgewiesene Sitzungen erfordern eine erneute Anmeldung; Formate werden nicht automatisch umgewandelt. Gültige normale, eingeschränkte und widerrufene Zugangstoken behalten ihre Berechtigungen nach einem Neustart. Speicherfehler werden gemeldet statt als erfolgreiche Schreibvorgänge bestätigt.

Die Capability auth:revokeSetupPendingAccessTokens akzeptiert keine Argumente und widerruft alle ausstehenden Sitzungen; Ausnahmen für einzelne Konten werden nicht mehr unterstützt.

## Geltungsbereich der Anmeldung

Kontoaktionen erfordern bestätigte Kontositzungen. Aktionen für freigegebene Ressourcen prüfen Gastanmeldungen ausdrücklich und kontrollieren die aktuelle Freigabe vor den Ressourcenberechtigungen. Kontonamen bestimmen niemals den Anmeldetyp. Widerrufener oder abgelaufener Zugriff wird abgelehnt.

## Registrierung abschließen

Öffentliche Registrierung und Einladungseinlösung geben einen auf 30 Minuten begrenzten Onboarding-Nachweis zurück, keine Sitzung. Er erlaubt weder gewöhnliche Konto-APIs noch Browseridentität, Sitzungsverlängerung oder Faktorbestätigung. Danach ist eine normale Anmeldung mit unveränderter abschließender TFA-Prüfung erforderlich.

Auth besitzt den Vertrag auth:onboarding in Version 1. registerOperation({id, available?, execute}) erfasst den aktuellen Bootstrap-Bereich des aufrufenden Anbieters; die ID muss diesem Besitzer gehören. Doppelte Registrierung schlägt fehl. Entfernung, fehlgeschlagener Bootstrap und erneute Aktivierung machen laufende Arbeit ungültig. listOperations() liefert registrierte IDs einschließlich vorübergehend nicht verfügbarer Handler; diese Metadaten gewähren keine Berechtigung. issue(accountId) prüft die Existenz des Kontos. Ein Konto mit ausstehender Validierung muss nicht aktiviert sein.

POST /api/v1/auth/onboarding/operations nimmt {operation, input} entgegen. Auth prüft Zweck, Ablauf, Konto und Besitzerlebensdauer, führt die Vorbereitung aus und ruft den Handler außerhalb dieses erweiterbaren Ablaufs auf. Direkte Ablaufaufrufe können keine Operation ausführen. Der Handler erhält {accountId, assertCurrent} und muss assertCurrent nach asynchroner Arbeit unmittelbar vor jeder Wirkung abwarten. Übermittelte Konto-IDs, gewöhnliche Eigentümerrechte und Gastidentitäten dürfen nicht verwendet werden. Bekannte Anbieterfehler dürfen genau {status, code} mit Status 400, 409, 422, 429 oder 503 und einem kurzen Code aus Kleinbuchstaben und Unterstrichen liefern. Unerwartete Fehler geben onboarding_operation_failed ohne interne Details zurück.

POST /api/v1/auth/onboarding/complete widerruft den Nachweis beim Abschluss oder Abbruch, ohne Sitzungsaustausch. Erfolgreiche normale Anmeldung und Löschung unbestätigter Konten widerrufen nur deren Onboarding-Nachweise. Unterbrochene Anfragen bleiben zeitlich begrenzt. Speicherformat 2 prüft den Onboarding-Zweck, Benutzerrolle, lokalen Anbieter, nicht ausstehende Einrichtung und höchstens 30 Minuten Gültigkeit ausdrücklich.

Tokendatei, Anbieterdatenbank und Zustellung bilden keine gemeinsame Transaktion. Bereits ausgeführte Wirkungen können nach späteren Fehlern bestehen bleiben. Browserbereinigung beim Schließen oder bei Netzfehlern ist nur ein bestmöglicher Versuch, keine Zustellgarantie.

Der Widerruf wirkt sofort in diesem Prozess; ein fehlgeschlagener Dateischreibvorgang kann jedoch die vorherige Berechtigung auf dem Datenträger bis zum erfolgreichen erneuten Versuch belassen. Der Abschluss ist für einen aufbewahrten widerrufenen Onboarding-Nachweis idempotent und wiederholt dessen Speicherung. Kontolesen, asynchrone Verfügbarkeit und Anbieterwirkungen sind nicht speicherübergreifend atomar. Die Ausstellung ist eine vertrauenswürdige Serverschnittstelle, kein öffentlicher Endpunkt zur Ausstellung für übermittelte Konto-IDs.

## Ausstehende Anmeldung

Nach der Bestätigung des ersten Faktors durch einen SSO-Anbieter kehren Konten mit einem zweiten Faktor zu `/login` zurück und geben den bereits versandten Code ein. Vor der Prüfung wird weder eine Sitzung erstellt noch das Profil reaktiviert. „Erneut versuchen“ lädt die ausstehende Abfrage nach einem vorübergehenden Fehler erneut; „Abbrechen“ verwirft den Versuch und öffnet die normale Anmeldung. Neuladen sendet keine weitere E-Mail.

Auth 2.2.10 ergänzt `GET /api/v1/auth/login-attempt` und `DELETE /api/v1/auth/login-attempt`. GET liefert `{data: null}` oder die vorhandene TFA-Darstellung mit `tfaRequired`, `loginAttemptId`, Methodenbeschreibungen und `loginUrl: "/login"`. DELETE erwartet JSON `{loginAttemptId}` und beendet nur den exakt zum Browser-Cookie passenden Versuch. Beide Routen verwenden den Auth-Ablauf `auth:loginContinuation` mit `validateRequest` und `applyContinuation`. Kontoberechtigungen und Faktorprüfung bleiben unverändert.

Das Cookie `cognis_login_attempt` ist HttpOnly, nutzt SameSite=Lax, gilt für `/api/v1/auth` und übernimmt die bestehende Secure-Cookie-Richtlinie. Es verweist auf den ursprünglichen serverseitigen Versuch mit fünf Minuten Laufzeit. GET erstellt keinen Versuch, verlängert keine Frist und versendet keinen Code. Methodenmetadaten einschließlich ausgegebener Codelänge und Wartezeit bleiben unverändert. Ablauf, erfolgreiche atomare Nutzung, Abbruch und Auth-Bereinigung machen die Fortsetzung ungültig. Abmelden sowie eine spätere erfolgreiche Anmeldung ohne zweiten Faktor verwerfen den passenden Versuch.

Ein neuer ausstehender Versuch ersetzt den durch das eingehende Cookie bezeichneten Versuch. Tabs teilen das Browser-Cookie; beim Abbruch wird die angezeigte Versuchs-ID mitgesendet, damit ein älterer Tab keinen neueren Versuch beendet. GET und DELETE überschreiben das Cookie nie, auch nicht nach Ablauf. Gleichzeitige erste Anfragen ohne gemeinsames Cookie erzeugen unabhängige Versuche; das vom Browser zuletzt übernommene Antwort-Cookie wählt die nächste Fortsetzung. Keine Anfrage erteilt dem anderen Konto eine Sitzung. Ein Abbruch macht eine bereits abgeschlossene Anmeldung nicht rückgängig. Versuche sind prozesslokal und gehen beim Neustart verloren.

SSO-Integrationen müssen `tfaRequired: true` als unvollständige Anmeldung behandeln und nur der ausdrücklichen Markierung `loginUrl: "/login"` einer erfolgreichen Antwort folgen. Die Markierung erscheint erst nach der Bindung eines gültigen Versuchs für das passende Konto und den passenden Anbieter. Auth 2.2.10 und X SSO 1.0.63 gemeinsam ausrollen; das Modul verweigert die Fortsetzung, wenn ein älterer Host den Vertrag nicht unterstützt. Lokale Anmeldung und SSO ohne TFA bleiben unverändert. Versuchs-IDs gehören nur in den Arbeitsspeicher oder Anfragekörper, niemals in URLs oder Browserspeicher. Die Anmeldeintegration erhält einen nur abfragbaren Wurzelbereich für den aktuellen Versuch und das eingebundene Formular; verspätete Arbeit kann keine ersetzte Ansicht ändern.

## Zeitlich begrenzte Challenge-Zustellung

`auth:getPendingLoginLifetime` Version 1 liest ausschließlich `{ id, accountId, expiresAt, signal }` eines vorhandenen, primär authentifizierten Versuchs. Der Aufruf erstellt oder verlängert keine Berechtigung. Auth legt den Versuch vor der automatischen Faktorvorbereitung an, ohne Sitzung oder Profilaktivierung. Die unveränderliche Fünf-Minuten-Frist begrenzt die Zustellung. Verbrauch, Abbruch, Ablauf, Ersetzung der Fortsetzung, Logout und Bereinigung beenden Challenge-Ressourcen. Cookie-gebundene Fortsetzung, Schutz vor veralteten Versuchen und Fortsetzen ohne Neuversand bleiben erhalten. Erfolgreiche Faktorprüfung beendet die Challenge, nicht den getrennten abschließenden Sitzungsabschluss. Ohne diesen Vertrag verweigert TFA den Vorgang.
