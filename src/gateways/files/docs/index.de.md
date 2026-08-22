# Datei-Speicher-Gateway

## Übersicht

Das Datei-Speicher-Gateway bietet der Plattform eine einheitliche, **namensraum-basierte** Schnittstelle zum Speichern und Abrufen von Dateien. Jede Dateioperation ist auf einen Namensraum beschränkt — einen isolierten Inhaltsbereich, der typischerweise von einer Komponente (`profile`, `chats`, `classes`) besitzt wird, sowie zwei fest eingebaute Namensräume, die dem Kern gehören (`default`, `user`). Namensräume tragen eine ACL-Obergrenze und ein optionales Speicherkontingent, sodass das Gateway von einem einzigen Durchsetzungspunkt aus alle Arten von Uploads unterstützen kann — private Benutzerdokumente, Chatroom-Anhänge, Profilbilder/-banner, Klassenmaterialien — anstatt dass jede Komponente Zugriffskontrolle und Kontingentprüfungen neu erfindet.

Das Gateway ist dauerhaft aktiviert (`required: true` im Manifest) und unterstützt keinen Adapterwechsel zur Laufzeit. Der lokale Datei-Adapter ist heute das einzige konkrete Speicher-Backend, aber die Schnittstelle `FileStorageGateway` ist in `src/core/contracts/files-gateway.ts` definiert, sodass alternative Backends hinzugefügt werden können, ohne den Gateway-Bootstrap oder Konsumenten zu ändern.

## Zuständigkeiten

- Instanziierung von `LocalFileGateway` mit dem aus `MEDIA_LOCATION` abgeleiteten Speicher-Root.
- Verwaltung der `NamespaceRegistry`, die Namensraum-Registrierungen von jeder Komponente über die Fähigkeit `files:registerNamespace` entgegennimmt.
- Durchsetzung der ACL-Obergrenze jedes Namensraums bei jedem Schreibvorgang sowie der Objekt-ACL bei jedem Lese-/Löschvorgang.
- Durchsetzung von Namensraum- und globalen Speicherkontingenten (über den Kontingent-Adapter) vor jedem Schreibvorgang.
- Bereitstellung der namensraum-basierten `files:*`-Fähigkeiten und namensraum-basierten HTTP-Routen.
- Beibehaltung der veralteten, nicht namensraum-basierten Fähigkeiten `file:write`/`file:read`/`file:append`, die ausschließlich vom Logging-Gateway für strukturierte Protokollschreibvorgänge verwendet werden (keine Benutzerinhalte).

Nicht zuständig für: die physische Speicherung von Dateien (Aufgabe des Adapters) oder die Interpretation der Bedeutung eines `groupIds`-Eintrags (eine von der besitzenden Komponente gewählte, undurchsichtige Kennung einer Mitarbeitergruppe — eine Chatroom-ID, eine Klassen-ID usw.).

## Architektur

### Namensräume

Ein Namensraum wird einmalig von seiner besitzenden Komponente über die Fähigkeit `files:registerNamespace` registriert:

```ts
ctx.capabilities.get("files:registerNamespace")?.({
    id: "profile",
    ownerComponent: "social-profile",
    acl: { visibility: "component-managed" },
    allowComponents: ["some-other-component"], // optional, "core" ist immer erlaubt
});
```

Die Registrierung erfolgt einmalig; eine doppelte ID wirft einen Fehler. Fest eingebaute Namensräume (von diesem Gateway selbst bei seinem eigenen Bootstrap registriert):

| Namensraum | Besitzer | Sichtbarkeit      | Zweck                                                          |
| ---------- | -------- | ----------------- | -------------------------------------------------------------- |
| `default`  | core     | component-managed | Anwendungs-/systemeigene Inhalte (Logos, generierte Dokumente) |
| `user`     | core     | private-owner     | Streng privates persönliches Repository pro Benutzer           |

Von Komponenten registrierte Namensräume:

| Namensraum | Besitzer        | Sichtbarkeit      | Zweck                               |
| ---------- | --------------- | ----------------- | ----------------------------------- |
| `profile`  | social-profile  | component-managed | Profilbilder/-banner — breit lesbar |
| `chats`    | social-messages | private-group     | Chatroom-Anhänge/-Avatare           |
| `classes`  | study-classes   | private-group     | Klassenmaterialien                  |

### ACL-Modell

Jeder Namensraum deklariert eine `visibility`-Obergrenze, die jedes in ihn geschriebene Objekt begrenzt:

- **`private-owner`** — das Objekt ist nur für seinen Besitzer sichtbar, ohne Ausnahme. `groupIds`/`publicRead` werden beim Schreiben rundweg abgelehnt.
- **`private-group`** — der Besitzer oder jeder in den `groupIds` des Objekts aufgeführte Akteur darf darauf zugreifen. `publicRead` wird abgelehnt.
- **`component-managed`** — der Besitzer, Gruppenmitglieder oder (bei `publicRead: true`) jeder darf darauf zugreifen. Die am wenigsten restriktive Stufe.

Jeder Schreibvorgang trägt außerdem eine Objekt-ACL (`ownerId`, optional `groupIds`, optional `publicRead`), die von der aufrufenden Komponente festgelegt wird. Das Gateway lehnt jede Objekt-ACL ab, die einen breiteren Zugriff beansprucht, als die Obergrenze ihres Namensraums erlaubt (`AclCeilingViolationError`, HTTP 400) — ein Objekt kann niemals offener sein als sein Namensraum es zulässt.

### Kontingente

Ein separater Kontingent-Adapter (`src/adapters/file/quota/`) verfolgt:

- Vom Administrator einstellbare Standardkontingente pro Namensraum sowie ein einzelnes globales Standardkontingent über alle Namensräume hinweg.
- Pro-Benutzer-Kontingent-Schnappschüsse, die zum Zeitpunkt der Kontoerstellung (`files:quota:provisionUser`) aus den aktuellen Standardwerten erstellt werden, sodass das Kontingent eines Benutzers widerspiegelt, was bei der Registrierung galt; Administratoren können das Kontingent eines Benutzers danach bearbeiten.

Die Nutzung wird inkrementell in der Metadatentabelle der Dateiobjekte (`file_objects`) verfolgt, anstatt bei jedem Schreibvorgang neu gescannt zu werden. Ein Schreibvorgang, der entweder die Namensraum- oder die globale Nutzung über das Kontingent hinaus erhöhen würde, wird mit `QuotaExceededError` (HTTP 413) abgelehnt.

### Bereitgestellte Fähigkeiten

| Fähigkeit                              | Beschreibung                                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `files:registerNamespace`              | Einmalige Namensraum-Registrierung (wirft Fehler bei doppelter ID)                                   |
| `files:namespace`                      | Erstellt einen namensraumgebundenen Client für eine Komponente                                       |
| `files:put`                            | Schreiben auf einen expliziten, namensraum-relativen Schlüssel                                       |
| `files:store`                          | Schreiben mit generiertem UUID-basiertem Schlüssel unter `{actorId}/`                                |
| `files:get`                            | Lesen, vorbehaltlich ACL                                                                             |
| `files:delete`                         | Löschen, vorbehaltlich ACL                                                                           |
| `files:list`                           | Auflisten von Objekten in einem Namensraum, gefiltert nach Zugriffsrecht                             |
| `files:quota:provisionUser`            | Schnappschuss der aktuellen Namensraum-/globalen Kontingent-Standardwerte für einen (neuen) Benutzer |
| `file:write`/`file:read`/`file:append` | Veraltet, nicht namensraum-basiert — nur Logging-Gateway                                             |

Komponenten sollten für reguläre Dateioperationen über `ctx` bevorzugt `files:namespace` verwenden: `namespaceId` und `callerComponent` werden einmal beim Bootstrap gebunden, danach erhält der zurückgegebene Client pro Operation nur noch Akteur, Schlüssel, Inhalt und ACL-Optionen. Die niedrigeren Fähigkeiten `files:put`/`files:store`/`files:get`/`files:delete`/`files:list` bleiben verfügbar, wenn ein Aufrufer Namespaces wirklich dynamisch wählen muss. Alle namensraum-basierten Fähigkeiten nehmen einen `FileAccessContext` (`actorId`, `callerComponent`, optional `role`) entgegen, sodass das Gateway zusätzlich zur Objekt-ACL die komponentenübergreifende Zulassungsliste des Namensraums prüfen kann (`"core"` ist immer erlaubt).

### HTTP-Routen

- `PUT/GET/DELETE /api/v1/files/:namespace/*key` — generische, namensraum-basierte Dateioperationen; erfordert Authentifizierung, die Akteur-Identität stammt aus der Sitzung.
- `GET /api/v1/files/:namespace` — Auflistung.
- `GET/PUT /api/v1/files/admin/namespace-defaults[/:namespaceId]`, `PUT /api/v1/files/admin/global-default`, `GET /api/v1/files/admin/users/:username/quotas`, `PUT /api/v1/files/admin/users/:username/quotas/:namespaceId` — administratoreigene Kontingentverwaltung (`namespaceId: "global"` adressiert das globale Kontingent des Benutzers).

### Bootstrap-Reihenfolge-Einschränkung

`GatewayService.bootstrap()` bootstrapt das Datei-Gateway immer vor dem Datenbank-Gateway. Folglich kann das Datei-Gateway nicht davon ausgehen, dass `db:executor` zum Zeitpunkt seines eigenen Bootstraps verfügbar ist — die datenbankgestützte Schemaerstellung (Metadaten der Dateiobjekte, Kontingenttabellen) wird auf den ersten tatsächlichen Aufruf verschoben, anstatt eifrig ausgeführt zu werden.

## Konfiguration

| Variable         | Standard     | Beschreibung                                                                                       |
| ---------------- | ------------ | -------------------------------------------------------------------------------------------------- |
| `MEDIA_LOCATION` | `/app/media` | Stammverzeichnis für Medienspeicherung; Uploads gehen an `$MEDIA_LOCATION/uploads/<namespace>/...` |

### Browserclient-Capability

`files:uiClient` wird vom Files-UI-Anbieter bereitgestellt und löst namensraumbezogene Datei-URLs für Browsermodule auf.
