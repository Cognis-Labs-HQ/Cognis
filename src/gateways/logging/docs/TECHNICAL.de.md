# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Anwendungsprotokolle.

## Schnittstellen

`logging:recentEntries` liefert Kopien von höchstens 30 bereinigten Diagnoseeinträgen mit `timestamp`, `level` und `message`. Fehlerberichte nutzen diese öffentliche Fähigkeit, statt Konsolenmethoden in Core umzuleiten. Der lokale Verlauf enthält auch anonyme Diagnosen; Serverübertragung und Browserausgabe folgen weiterhin den getrennten Gateway-Richtlinien.

### Architektur

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

Standardmäßig schreibt der Logger Konsolenausgaben und speichert weiterhin JSON-Zeilen in der persistenten Protokolldatei. `LOG_LEVEL` filtert stdout/stderr und `LOG_FILE_LEVEL` filtert unabhängig die persistenten Dateieinträge. Administratoren können beide Adapterkonfigurationen zur Laufzeit überschreiben und auf die Umgebungswerte zurücksetzen. Überschreibungen werden in der Datenbank gespeichert und beim Start des Gateways wiederhergestellt, sodass sie Container-Neustarts überstehen.

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

### Konfiguration

Die DB-Gateway-Ereignisse verwenden ebenfalls den gemeinsamen Logger, protokollieren jedoch nur zusammengefasste Metadaten (`provider`, SQL-Anweisungstyp, Parameteranzahl, Fehlername/-code). Rohmeldungen der Datenbank werden nicht wörtlich weitergereicht, da der Datenbank-Container sie bereits selbst protokolliert.

| Variable               | Standard            | Beschreibung                                                           |
| ---------------------- | ------------------- | ---------------------------------------------------------------------- |
| `LOG_LEVEL`            | `info`              | Laufzeit-Logstream-Filter: `debug`, `info`, `warn`, `error`            |
| `LOG_FILE_LEVEL`       | `debug`             | Filter für persistente Dateieinträge: `debug`, `info`, `warn`, `error` |
| `LOG_FILE`             | `/app/logs/app.log` | Absoluter Pfad für die persistente Protokolldatei                      |
| `LOG_FORMAT`           | `pretty`            | Konsolenformat: `pretty` für lesbare Logs oder `json` für Roh-JSON     |
| `LOG_ROTATE_MAX_BYTES` | `10485760`          | Rotiert die aktive Logdatei bei Erreichen dieser Größe (Bytes)         |
| `LOG_ROTATE_MAX_FILES` | `10`                | Anzahl aufbewahrter rotierter Logarchive (`0` = keine)                 |
| `LOG_ROTATE_COMPRESS`  | `true`              | Wenn `true`, werden rotierte Logs als gzip (`.gz`) komprimiert         |

## Verhalten

`ui/reuse/levels.json` ist der einzige Katalog für Schweregradprioritäten und Konsolen-Aliasse. Das gemeinsame Modul leitet erlaubte Stufen, Zugehörigkeitsprüfungen und Konsolenzuordnungen daraus ab; Serverfilter, Browserannahme und Konsolenerfassung verwenden diese Definitionen gemeinsam.

### Zentrale Browserdiagnose

Browseraufrufer binden `ui:log` über die gemeinsame ctx-Fähigkeitsregistrierung. Der Host hält über alle Bindungen hinweg höchstens 128 aufgeschobene Fähigkeitsaufrufe vor; er besitzt weder eine protokollspezifische Abonnement- noch eine Ausgaberichtlinie. Der Logging-Anbieter stellt `ui:log` für seine begrenzte Laufzeit bereit und verwaltet Prüfung, Verlauf, Übertragung und Konsolenerfassung. Beim Entfernen des Anbieters wird die Fähigkeit freigegeben; aufgeschobene Aufrufe können einen späteren Anbieter ohne Implementierungsimport erreichen.

Der öffentliche Browseranbieter besitzt den Ablauf `logging:emit` (`validate`, `deliver`, `publish`). Metadaten werden begrenzt und Zugangsdaten sowie rohe Fehlermeldungen entfernt.

Service Worker leiten strukturierte `COGNIS_LOG`-Ereignisse an genau ein kontrolliertes Fenster weiter. Ohne verfügbares Fenster bleiben höchstens 64 Ereignisse im Puffer. Der Anbieter akzeptiert Nachrichten ausschließlich vom aktuellen Service-Worker-Controller und entfernt beim Beenden seine Listener, Konsolenumleitung und Ereignisübernahme.

`POST /api/v1/logging/entries` erfordert weiterhin eine Anmeldung. Die Antwort mit Status 204 enthält `x-cognis-log-console: true` nur für Administratoren, wenn das Ereignis den aktuellen Schwellwert des Konsolenadapters erreicht. Erst diese Freigabe erlaubt die Browserausgabe. Abgelehnte oder fehlgeschlagene Übertragungen erzeugen keine Konsolenausgabe und keine rekursiven Meldungen. Anonyme Ereignisse erreichen den Gateway-Anbieter, werden jedoch weder an den geschützten Endpunkt gesendet noch ausgegeben. Die Filter für Serverkonsole und Datei bleiben unabhängig.

### Überblick

Das Logging-Gateway stellt strukturiertes Anwendungslogging auf stdout/stderr und optional in eine persistente Protokolldatei bereit. Es erstellt eine `Logger`-Instanz aus Umgebungsvariablen und trägt sie zum Capability-Store bei, sodass jede Komponente, die loggen muss, dies über eine einheitliche Schnittstelle tun kann, ohne eine Logger-Bibliothek direkt zu importieren.

Das Logging-Gateway muss nach dem Dateispeicher-Gateway gebootstrappt werden. Diese Abhängigkeit ist in seiner `manifest.json` über `requires: ["files"]` deklariert.

### Verantwortlichkeiten

- Eine `Logger`-Instanz aus `LOG_LEVEL`, `LOG_FILE`, `LOG_FORMAT` und Rotationsvariablen erstellen und konfigurieren.
- `logging:logger` und `logging:log` zum Capability-Store beitragen.
- Log-Datei-Schreibvorgänge durch `file:append` routen, wenn verfügbar.
- `GET /api/v1/logging/stream` für die Seite Administration → Protokolle bereitstellen (admin-only SSE-Stream mit Schweregrad-/Stichwortfiltern).
- Das `logging`-Gateway im Gateway-Registry registrieren.

### Browserprotokolle erfassen

Authentifizierte Browserkomponenten senden strukturierte Einträge mit `POST /api/v1/logging/entries` im Format `{ level, message, meta }`. Das Gateway validiert Stufe und Nachricht, ergänzt das authentifizierte Konto sowie die Browserquelle und schreibt den Eintrag über `logging:log`.

### Lokalisierte Adapterfelder

Logging-Adapterdefinitionen verwenden `labelKey`. Das Gateway serialisiert Katalog- und Konfigurationsschemata mit dem browserseitigen Übersetzungsschlüssel `label` und liefert die jeweilige `stringsBaseUrl`. Typen, Optionen und Werte behalten ihre anbietereigene Bedeutung. Konfigurationen bleiben ausschließlich für Administratoren lesbar.

## Sicherheit

Protokolleinsicht und Konfiguration benötigen Verwaltungsrechte. Behandle Meldungen und Metadaten als sensibel; protokolliere keine Passwörter, Tokens oder privaten Nachrichten.

## Referenz

### Technische Spezifikation

| Seite / Bereich             | Anleitung         | Zugriff       |
| --------------------------- | ----------------- | ------------- |
| `/administration` · `#logs` | Protokolle prüfen | Administrator |

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/adapters/social/messages/technical).
