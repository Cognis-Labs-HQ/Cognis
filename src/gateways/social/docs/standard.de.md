# Social-Gateway

## Überblick

Das Social-Gateway koordiniert nutzernahe soziale Funktionen: Profile,
Beiträge, den sozialen Graphen und private Nachrichten. Es enthält keine eigene
Datenbanklogik, sondern entdeckt und startet Adapter unter
`src/adapters/social/`. Jeder Adapter verantwortet einen abgegrenzten Bereich.
Wenn das Gateway deaktiviert wird, werden alle Social-Adapter gemeinsam
deaktiviert, ohne Auth, Notify oder andere Gateways zu beeinflussen.

Ein neuer sozialer Funktionsbereich wird hinzugefügt, indem ein neuer Adapter
unter `src/adapters/social/` angelegt wird. Eine zentrale Registrierung ist
nicht nötig.

## Zuständigkeiten

- Alle Social-Adapter beim Serverstart über
  `CoreSocialGateway.bootstrapAdapters()` entdecken und starten.
- Die Registry registrierter Adapter pflegen und über
  `GET /api/v1/gateways/social/adapters` für die Administrationsoberfläche
  bereitstellen.
- `SocialAdapterBootstrapCtx` an jeden Adapter übergeben, damit dieser Routen,
  statische Assets, Navbar-Plugins und Capabilities beitragen kann.
- Die Profile-zuerst-Startreihenfolge erzwingen, damit `social:profileStore`
  verfügbar ist, bevor der Messages-Adapter ausgeführt wird.

Nicht zuständig für: Profillogik, Messaginglogik, Beitragslogik oder
Dateispeicher. Diese Bereiche gehören zu den jeweiligen Adaptern.

## Architektur

### CoreSocialGateway

`src/gateways/social/gateway.ts` definiert `CoreSocialGateway`. Adapter folgen
dem gleichen Discovery- und Bootstrap-Lebenszyklus wie das Notification-Gateway:
`createSocialAdapter()` deklariert die Adapteridentität für Admin-Listen und den
persistierten Schalterzustand, während `bootstrapSocialAdapter(ctx)` Routen,
statische Assets, Navbar-Einträge und Capabilities verdrahtet.

Das Gateway stellt diese Methoden bereit:

| Methode                        | Beschreibung                                        |
| ------------------------------ | --------------------------------------------------- |
| `discoverAdapters(root)`       | Importiert Adapter-Factories und speichert IDs      |
| `loadPersistedConfigs()`       | Stellt gespeicherte Aktivierungszustände wieder her |
| `registerAdapter(adapter)`     | Speichert einen entdeckten Adapter                  |
| `listAdapters()`               | Gibt alle registrierten Adapter für die API zurück  |
| `enableAdapter(id)`            | Aktiviert einen Adapter und speichert den Zustand   |
| `disableAdapter(id)`           | Deaktiviert einen Adapter und speichert den Zustand |
| `bootstrapAdapters(root, ctx)` | Importiert und startet Adapter-Bootstrapper         |

### Adapter-Bootstrap

`discoverAdapters` durchsucht das angegebene Root-Verzeichnis, liest jedes
`package.json`, importiert den Adapter-Einstiegspunkt und registriert Module,
die `createSocialAdapter()` exportieren. Nachdem persistierte Konfigurationen
geladen wurden, importiert `bootstrapAdapters` dieselben Module und ruft
`bootstrapSocialAdapter` auf, sofern vorhanden. Adapterfehler werden einzeln
abgefangen und protokolliert.

Profile wird zuerst sortiert, damit es `social:profileStore` vor Messages
beiträgt. Fehlt Profile oder schlägt es fehl, findet Messages diese Capability
nicht und überspringt profilabhängige Funktionen kontrolliert.

### SocialAdapterBootstrapCtx

Definiert in `src/gateways/social/gateway.ts` und an jeden Adapter übergeben:

| Feld                                    | Beschreibung                                                            |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `gateway`                               | `CoreSocialGateway`-Instanz für Gateway-Steuerung                       |
| `adapterId`                             | Verzeichnisname des gestarteten Adapters                                |
| `adapterRoot`                           | Absoluter Pfad zum Adapterverzeichnis                                   |
| `capabilities`                          | Gemeinsamer `CapabilityStore`                                           |
| `gatewayRegistry`                       | Gateway-Registry; bevorzugt nur lesend verwenden                        |
| `registerRoute(handler, gwId)`          | Registriert eine HTTP-Route unter der Gateway-ID                        |
| `registerStaticDir(prefix, dir)`        | Stellt ein statisches Verzeichnis unter `/static/<prefix>/` bereit      |
| `registerAdapterStaticDir(gw, ad, dir)` | Stellt Dateien unter `/static/adapters/<gw>/<ad>/` bereit               |
| `registerNavbarPlugin(url, isEnabled?)` | Trägt ein bedingt aktiviertes Navbar-Skript bei                         |
| `log`                                   | Optionaler strukturierter Logger                                        |
| `dbExecutor`                            | Datenbank-Executor aus der Capability `db:executor`                     |
| `dbType`                                | Datenbankdialekt als Zeichenkette                                       |
| `isGatewayEnabled()`                    | Gibt `false` zurück, wenn das Social-Gateway deaktiviert ist            |
| `isAdapterEnabled(id?)`                 | Gibt `false` zurück, wenn der aktuelle/benannte Adapter deaktiviert ist |

## Enthaltene Adapter

- **Profile** (`src/adapters/social/profile/`) — Nutzerprofile, sozialer Graph,
  Beiträge, nutzerspezifische Einstellungen und Datei-Routen.
- **Messages** (`src/adapters/social/messages/`) — private Nachrichten und
  Chaträume mit serverseitig verschlüsselten Nachrichteninhalten.

## API-Routen

| Methode | Pfad                                           | Beschreibung                   | Auth  |
| ------- | ---------------------------------------------- | ------------------------------ | ----- |
| `GET`   | `/api/v1/gateways/social/adapters`             | Registrierte Adapter auflisten | Admin |
| `POST`  | `/api/v1/gateways/social/adapters/:id/enable`  | Adapter aktiv markieren        | Admin |
| `POST`  | `/api/v1/gateways/social/adapters/:id/disable` | Adapter inaktiv markieren      | Admin |

## Standard für Mitgliedschaftsänderungen

Soziale Komponenten verwenden für Mitgliedschaftsänderungen dieselben zwei Verben: `POST` fügt einen Benutzer hinzu und `DELETE` entfernt ihn. Jede Beziehung verwendet ihren dokumentierten kanonischen Pfad und Handles; `ctx`-Capabilities verwenden kanonische Konto-IDs. Beide Operationen sind idempotent. Erfolgreiche Änderungen liefern `200`, ungültige Eingaben `400`, fehlende Ressourcen `404` und verweigerte Änderungen `403`.

| Beziehung         | Hinzufügen                                                                      | Entfernen                                                      | `ctx`-Capability                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Chatraum-Mitglied | `POST /api/v1/social/messages/rooms/:roomId/members` mit `{ "handle": "user" }` | `DELETE /api/v1/social/messages/rooms/:roomId/members/:handle` | `social:messages:membership` mit `add({ roomId, actorAccountId, userAccountId })` und entsprechendem `remove(...)` |
| Profil-Follower   | `POST /api/v1/social/users/:handle/follow`                                      | `DELETE /api/v1/social/users/:handle/follow`                   | `social:profile:followers` mit `add({ followerAccountId, followedAccountId })` und entsprechendem `remove(...)`    |

`add` ist eine idempotente Sicherstellung einer aktiven Mitgliedschaft und hebt auch eine Archivierung auf. Meeting-Integrationen müssen die Operation bei jedem Beitritt eines Teilnehmers vor dem Laden des Chats aufrufen. So kann ein Benutzer, der den Chat verlassen hat, mit dem Meeting erneut beitreten. Das Verlassen des Chats entfernt den Teilnehmer nicht aus dem Meeting.

HTTP-Routen authentifizieren und autorisieren den Handelnden. Capabilities sind die vertrauenswürdige Server-zu-Server-Oberfläche; Aufrufer müssen bereits berechtigt sein und den Handelnden ausdrücklich angeben. Sie werden nur über `ctx.capabilities` bezogen.
