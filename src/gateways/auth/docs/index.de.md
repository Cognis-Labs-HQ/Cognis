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

Ein Anbieter kann `routeNamespace` und `registerRoutes(router)` in seinem Adapter deklarieren. Der Router akzeptiert `GET`- und `POST`-Pfade relativ zu `/api/v1/auth/<routeNamespace>`, sodass OAuth-Rückrufe unter dem Authentifizierungs-Gateway liegen können, ohne dem beitragenden Modul direkten Zugriff auf geschützte Core-Routen zu geben. Namespaces sind auf sichere URL-Segmente beschränkt, Core-Authentifizierungs-Namespaces sind reserviert, doppelte Routen werden abgelehnt und beim Entfernen des Anbieters werden alle beigetragenen Routen entfernt.

Sitzungen externer Anbieter durchlaufen `gateAccountCreation` vor `ensureExternalAccount`. Wenn die offene Registrierung deaktiviert ist, muss die Sitzung ein Registrierungstoken und eine passende Anbieter-E-Mail enthalten. Eine angehaltene Sitzung gibt `account_creation_required` mit `emailRequired` zurück, damit die Anbieteroberfläche eine fehlende E-Mail anfordern oder bei Abbruch sauber beenden kann.

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
