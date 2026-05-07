# Authentifizierungs-Gateway

## Überblick

Das Authentifizierungs-Gateway ist der zentrale Eingangspunkt für alle Anmelde- und Identitätsoperationen in Cognis. Es entkoppelt den Rest der Plattform von einem bestimmten Authentifizierungsanbieter, indem es sich zwischen Route-Handler und die konkreten Auth-Adapter stellt. Der Wechsel des Authentifizierungsanbieters — von lokalen Passwörtern zu LDAP oder SAML — erfordert nur das Aktivieren des neuen Adapters über die Admin-API; kein Route-Handler oder Core-Service muss geändert werden.

Das Gateway entdeckt Adapter durch Scannen von `src/adapters/auth/` beim Bootstrap. Jedes Adapterverzeichnis muss eine `createAdapter()`-Funktion exportieren. Der lokale Adapter wird immer zuerst geladen und besonders behandelt, da er die `user:*`-CLI-Befehle und den ersten Admin-Account-Erstellungsfluss unterstützt. Alle anderen Adapter werden aus ihren Verzeichnissen geladen und können zur Laufzeit durch einen Admin ohne Serverneustart aktiviert oder deaktiviert werden.

## Verantwortlichkeiten

- Alle Auth-Adapter aus `src/adapters/auth/` beim Bootstrap entdecken und registrieren.
- Adapter-Aktivierungsstatus in `auth_adapter_configs` verwalten und persistieren.
- Anmeldedaten durch Delegierung an den aktivierten Adapter für den angeforderten Anbieter verifizieren.
- Zugriffstoken nach erfolgreicher Authentifizierung über `issueAccessToken` ausstellen.
- `auth:accountStore`, `auth:createLocalAdmin` und `auth:getLoginMethods` zum Capability-Store beitragen.
- Alle Auth-API-Routen und Adapter-Admin-Routen registrieren.

Nicht verantwortlich für: Benutzerprofile speichern (das ist das Profil-Gateway), Session-Management über die Token-Ausstellung hinaus, oder nicht-auth-bezogene Geschäftslogik.

## Architektur

Die zentrale Klasse ist `CoreAuthGateway` in `src/gateways/auth/gateway.ts`. Sie hält eine Map registrierter Adapter, eine Menge aktivierter Adapter-IDs und eine Referenz auf den lokalen Adapter (der separat über `setLocalAdapter()` verkabelt wird).

```ts
export class CoreAuthGateway {
  registerAdapter(adapter: AuthProviderAdapter, requires?: string[]): void;
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

Bootstrap in `src/gateways/auth/bootstrap.ts`:

1. Instanziiert `DbLocalAccountStore` aus `src/adapters/auth/local/store.ts`.
2. Instanziiert `CoreAuthGateway` mit dem DB-Executor und -Typ.
3. Lädt den lokalen Adapter über `setLocalAdapter()`.
4. Ruft `discoverAdapters(authAdaptersRoot)` auf, um alle anderen Adapter zu laden.
5. Ruft `loadPersistedConfigs()` auf, um den Aktivierungsstatus aus der Datenbank wiederherzustellen.
6. Registriert Routen und Capabilities.

Beigetragene Capabilities:

| Capability              | Typ                                            | Beschreibung                                                  |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------------------- |
| `auth:accountStore`     | `LocalAccountStore`                            | Lokaler Account-Store, der vom lokalen Adapter verwendet wird |
| `auth:createLocalAdmin` | `(username, password) => Promise<AuthContext>` | Erstellt einen Admin-Account, wenn er nicht existiert         |
| `auth:getLoginMethods`  | `() => Promise<AdapterInfo[]>`                 | Gibt Metadaten für alle aktivierten Anbieter zurück           |

## API-Routen

| Methode | Pfad                                         | Beschreibung                                    | Authentifizierung |
| ------- | -------------------------------------------- | ----------------------------------------------- | ----------------- |
| `GET`   | `/api/v1/auth/login-methods`                 | Aktivierte Authentifizierungsanbieter auflisten | Keine             |
| `POST`  | `/api/v1/auth/register`                      | Neuen lokalen Account selbst registrieren       | Keine             |
| `POST`  | `/api/v1/auth/login`                         | Authentifizieren; gibt Bearer-Token zurück      | Keine             |
| `GET`   | `/api/v1/gateways/auth/adapters`             | Alle registrierten Auth-Adapter auflisten       | Admin             |
| `GET`   | `/api/v1/gateways/auth/adapters/:id/config`  | Konfig-Schema für einen Adapter abrufen         | Admin             |
| `PUT`   | `/api/v1/gateways/auth/adapters/:id/config`  | Konfig für einen Adapter aktualisieren          | Admin             |
| `POST`  | `/api/v1/gateways/auth/adapters/:id/enable`  | Adapter aktivieren                              | Admin             |
| `POST`  | `/api/v1/gateways/auth/adapters/:id/disable` | Adapter deaktivieren                            | Admin             |
