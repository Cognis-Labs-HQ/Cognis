# Dateispeicher-Gateway

## Überblick

Das Dateispeicher-Gateway stellt der Plattform eine einheitliche Schnittstelle für das Lesen, Schreiben und Anhängen von Dateien bereit. Es bootstrapt den lokalen Datei-Adapter und trägt vier Capabilities zum Capability-Store bei, sodass andere Gateways — das Profil-Gateway für Avatar-Uploads und das Logging-Gateway für Log-Schreibvorgänge — Dateioperationen nutzen können, ohne zu wissen, ob sie auf das lokale Dateisystem, einen S3-Bucket oder ein anderes Backend schreiben.

## Verantwortlichkeiten

- `LocalFileGateway` mit dem aus `MEDIA_LOCATION` abgeleiteten Speicher-Root instanziieren.
- `file:gateway`, `file:write`, `file:read` und `file:append` zum Capability-Store beitragen.
- Das `files`-Gateway im Gateway-Registry registrieren.

## Architektur

### FileStorageGateway-Schnittstelle

```ts
export interface FileStorageGateway {
    put(
        key: string,
        content: Uint8Array,
        contentType?: string,
    ): Promise<StoredObject>;
    store(
        userId: string,
        content: Uint8Array,
        contentType?: string,
    ): Promise<StoredObject>;
    get(key: string): Promise<Uint8Array | null>;
    delete(key: string): Promise<boolean>;
    list(prefix?: string): Promise<StoredObject[]>;
}
```

### Beigetragene Capabilities

| Capability     | Typ                                     | Beschreibung                                                |
| -------------- | --------------------------------------- | ----------------------------------------------------------- |
| `file:gateway` | `FileStorageGateway`                    | Die vollständige Gateway-Instanz                            |
| `file:write`   | `(filePath, content) => Promise<void>`  | Überschreibt eine Datei                                     |
| `file:read`    | `(filePath) => Promise<Buffer \| null>` | Liest eine Datei                                            |
| `file:append`  | `(filePath, content) => Promise<void>`  | Hängt Text an eine Datei an (vom Logging-Gateway verwendet) |

## Konfiguration

| Variable         | Standard     | Beschreibung                                                                 |
| ---------------- | ------------ | ---------------------------------------------------------------------------- |
| `MEDIA_LOCATION` | `/app/media` | Stammverzeichnis für Medienspeicher; Uploads unter `$MEDIA_LOCATION/uploads` |
