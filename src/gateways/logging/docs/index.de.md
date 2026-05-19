# Logging-Gateway

## Überblick

Das Logging-Gateway stellt strukturiertes Anwendungslogging auf stdout/stderr und optional in eine persistente Protokolldatei bereit. Es erstellt eine `Logger`-Instanz aus Umgebungsvariablen und trägt sie zum Capability-Store bei, sodass jede Komponente, die loggen muss, dies über eine einheitliche Schnittstelle tun kann, ohne eine Logger-Bibliothek direkt zu importieren.

Das Logging-Gateway muss nach dem Dateispeicher-Gateway gebootstrappt werden. Diese Abhängigkeit ist in seiner `manifest.json` über `requires: ["files"]` deklariert.

## Verantwortlichkeiten

- Eine `Logger`-Instanz aus `LOG_LEVEL`, `LOG_FILE`, `LOG_FORMAT` und Rotationsvariablen erstellen und konfigurieren.
- `logging:logger` und `logging:log` zum Capability-Store beitragen.
- Log-Datei-Schreibvorgänge durch `file:append` routen, wenn verfügbar.
- `GET /api/v1/logging/stream` für die Seite Administration → Protokolle bereitstellen (admin-only SSE-Stream mit Schweregrad-/Stichwortfiltern).
- Das `logging`-Gateway im Gateway-Registry registrieren.

## Architektur

```ts
export class Logger {
    constructor(
        level: LogLevel,
        filePath: string,
        fileAppend?: FileAppend,
        consoleFormat?: ConsoleLogFormat,
    );
    async log(
        level: LogLevel,
        message: string,
        meta?: Record<string, unknown>,
    ): Promise<void>;
    debug(message: string, meta?: Record<string, unknown>): Promise<void>;
    info(message: string, meta?: Record<string, unknown>): Promise<void>;
    warn(message: string, meta?: Record<string, unknown>): Promise<void>;
    error(message: string, meta?: Record<string, unknown>): Promise<void>;
}
```

Standardmäßig schreibt der Logger Konsolenausgaben und speichert weiterhin JSON-Zeilen in der persistenten Protokolldatei. `LOG_LEVEL` wirkt als Filter für den Laufzeit-Log-Stream (stdout/stderr); die Datei enthält weiterhin alle Log-Level.

Jede persistente Protokollzeile ist ein JSON-Objekt:

```json
{
    "ts": "2024-01-15T10:00:00.000Z",
    "level": "info",
    "message": "Gateway gebootstrappt.",
    "gateway": "auth"
}
```

| Capability       | Typ                               | Beschreibung                                                            |
| ---------------- | --------------------------------- | ----------------------------------------------------------------------- |
| `logging:logger` | `Logger`                          | Vollständige Logger-Instanz                                             |
| `logging:log`    | `(level, message, meta?) => void` | Einfache Log-Funktion; als `ctx.log` vom Gateway-Bootstrapper verwendet |

## Konfiguration

Die DB-Gateway-Ereignisse verwenden ebenfalls den gemeinsamen Logger, protokollieren jedoch nur zusammengefasste Metadaten (`provider`, SQL-Anweisungstyp, Parameteranzahl, Fehlername/-code). Rohmeldungen der Datenbank werden nicht wörtlich weitergereicht, da der Datenbank-Container sie bereits selbst protokolliert.

| Variable               | Standard            | Beschreibung                                                       |
| ---------------------- | ------------------- | ------------------------------------------------------------------ |
| `LOG_LEVEL`            | `info`              | Laufzeit-Logstream-Filter: `debug`, `info`, `warn`, `error`        |
| `LOG_FILE`             | `/app/logs/app.log` | Absoluter Pfad für die persistente Protokolldatei                  |
| `LOG_FORMAT`           | `pretty`            | Konsolenformat: `pretty` für lesbare Logs oder `json` für Roh-JSON |
| `LOG_ROTATE_MAX_BYTES` | `10485760`          | Rotiert die aktive Logdatei bei Erreichen dieser Größe (Bytes)     |
| `LOG_ROTATE_MAX_FILES` | `10`                | Anzahl aufbewahrter rotierter Logarchive (`0` = keine)             |
| `LOG_ROTATE_COMPRESS`  | `true`              | Wenn `true`, werden rotierte Logs als gzip (`.gz`) komprimiert     |
