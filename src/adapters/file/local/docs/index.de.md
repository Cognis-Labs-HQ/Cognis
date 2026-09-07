# Lokaler Dateispeicheradapter

## Überblick

Der lokale Datei-Adapter speichert hochgeladene Dateien auf dem lokalen Dateisystem des Servers. Er ist der einzige Dateispeicheradapter in der aktuellen Plattform, und sein Manifest enthält `"locked": true`, was bedeutet, dass er nicht über die UI deaktiviert oder ersetzt werden kann. Jede zukünftige Cloud-Speicher-Implementierung (S3, GCS, Azure Blob) wäre ein Drop-in-Ersatz für diesen Adapter.

Der Adapter ist namensraum-basiert: Jede Operation nimmt zuerst eine `namespaceId` entgegen, und die physische Speicherung ist bei `{storageRoot}/{namespaceId}/...` verwurzelt, sodass Dateien verschiedener Namensräume niemals auf der Festplatte kollidieren.

## Verantwortlichkeiten

- Die namensraum-basierte `FileStorageGateway`-Schnittstelle implementieren: `put`, `store`, `get`, `delete` und `list`, jeweils zuerst mit Namensraum.
- Einen stabilen Dateiextension aus dem MIME-Typ jeder hochgeladenen Datei ableiten.
- UUID-basierte Dateinamen für Dateien generieren, die über `store()` gespeichert werden.
- Gespeicherte Dateien im Bereich `{namespaceId}/{actorId}/{uuid}.{ext}` ablegen.

- Dateien von `$MEDIA_LOCATION/uploads` im lokalen Dateisystem bereitstellen.

Nicht verantwortlich für: HTTP-Auslieferung von Dateien (das erledigen die Routen des Files-Gateways) sowie ACL- oder Quota-Erzwingung (der `NamespaceFileService` des Files-Gateways prüft dies vor jedem Adapteraufruf).

### Namespace- und Schlüssel-Isolation

`store(namespaceId, actorId, content, contentType)` generiert eine `uuid` und schreibt nach `{namespaceId}/{actorId}/{uuid}.{ext}`; `put(namespaceId, key, content, contentType)` schreibt nach `${storageRoot}/${namespaceId}/${key}` und legt Zwischenverzeichnisse an. Ein privater `namespaceRoot(namespaceId)`-Helper löst das pro Namespace genutzte Stammverzeichnis für alle Methoden auf.

## Architektur

### MIME-zu-Extension-Zuordnung

| MIME-Typ     | Extension |
| ------------ | --------- |
| `image/jpeg` | `jpg`     |
| `image/png`  | `png`     |
| `image/webp` | `webp`    |
| `image/gif`  | `gif`     |

Dateien mit nicht in dieser Zuordnung enthaltenen MIME-Typen werden mit der Extension `.bin` gespeichert.

### Manifest

`src/adapters/file/local/manifest.json`:

```json
{
    "id": "local",
    "locked": true
}
```

## Konfiguration

| Variable         | Standard     | Beschreibung                                                                     |
| ---------------- | ------------ | -------------------------------------------------------------------------------- |
| `MEDIA_LOCATION` | `/app/media` | Stammverzeichnis für Medien; Uploads unter `$MEDIA_LOCATION/uploads` gespeichert |
