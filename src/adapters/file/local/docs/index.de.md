# Lokaler Dateispeicheradapter

## Überblick

Der lokale Datei-Adapter speichert hochgeladene Dateien auf dem lokalen Dateisystem des Servers. Er ist der einzige Dateispeicheradapter in der aktuellen Plattform, und sein Manifest enthält `"locked": true`, was bedeutet, dass er nicht über die UI deaktiviert oder ersetzt werden kann. Jede zukünftige Cloud-Speicher-Implementierung (S3, GCS, Azure Blob) wäre ein Drop-in-Ersatz für diesen Adapter.

## Verantwortlichkeiten

- Die `FileStorageGateway`-Schnittstelle implementieren: `put`, `store`, `get`, `delete` und `list`.
- Einen stabilen Dateiextension aus dem MIME-Typ jeder hochgeladenen Datei ableiten.
- UUID-basierte Dateinamen für Dateien generieren, die über `store()` gespeichert werden.
- Gespeicherte Dateien im Bereich `{userId}/{uuid}.{ext}` ablegen.

## Architektur

### MIME-zu-Extension-Zuordnung

| MIME-Typ | Extension |
| --------- | --------- |
| `image/jpeg` | `jpg` |
| `image/png` | `png` |
| `image/webp` | `webp` |
| `image/gif` | `gif` |

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

| Variable | Standard | Beschreibung |
| -------- | -------- | ------------ |
| `MEDIA_LOCATION` | `/app/media` | Stammverzeichnis für Medien; Uploads unter `$MEDIA_LOCATION/uploads` gespeichert |
