# Logging-Gateway

## Überblick

Das Logging-Gateway stellt strukturiertes Anwendungslogging auf stdout/stderr und optional in eine persistente Protokolldatei bereit. Es erstellt eine `Logger`-Instanz aus Umgebungsvariablen und trägt sie zum Capability-Store bei, sodass jede Komponente, die loggen muss, dies über eine einheitliche Schnittstelle tun kann, ohne eine Logger-Bibliothek direkt zu importieren.

Das Logging-Gateway muss nach dem Dateispeicher-Gateway gebootstrappt werden. Diese Abhängigkeit ist in seiner `manifest.json` über `requires: ["files"]` deklariert.

## Verantwortlichkeiten

- Eine `Logger`-Instanz aus `LOG_LEVEL` und `LOG_FILE` erstellen und konfigurieren.
- `logging:logger` und `logging:log` zum Capability-Store beitragen.
- Log-Datei-Schreibvorgänge durch `file:append` routen, wenn verfügbar.
- Das `logging`-Gateway im Gateway-Registry registrieren.

## Architektur

```ts
export class Logger {
  constructor(level: LogLevel, filePath: string, fileAppend?: FileAppend);
  async log(level: LogLevel, message: string, meta?: Record<string, unknown>): Promise<void>;
  info(message: string, meta?: Record<string, unknown>): Promise<void>;
  warn(message: string, meta?: Record<string, unknown>): Promise<void>;
  error(message: string, meta?: Record<string, unknown>): Promise<void>;
}
```

Jede Protokollzeile ist ein JSON-Objekt:

```json
{ "ts": "2024-01-15T10:00:00.000Z", "level": "info", "message": "Gateway gebootstrappt.", "gateway": "auth" }
```

| Capability | Typ | Beschreibung |
| ---------- | --- | ------------ |
| `logging:logger` | `Logger` | Vollständige Logger-Instanz |
| `logging:log` | `(level, message, meta?) => void` | Einfache Log-Funktion; als `ctx.log` vom Gateway-Bootstrapper verwendet |

## Konfiguration

| Variable | Standard | Beschreibung |
| -------- | -------- | ------------ |
| `LOG_LEVEL` | `info` | Mindest-Log-Level: `debug`, `info`, `warn` oder `error` |
| `LOG_FILE` | `/app/logs/app.log` | Absoluter Pfad für die persistente Protokolldatei |
