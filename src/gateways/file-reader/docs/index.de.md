# File-Reader-Gateway

## Überblick

Das File-Reader-Gateway bietet einen einheitlichen, adaptergesteuerten Mechanismus zur Darstellung von Dateien in Cognis – Unterrichtsmaterialien, hochgeladene Anhänge und alle Ressourcen, die Benutzer in der App öffnen. Es entkoppelt die restliche Plattform von spezifischen Dateiformaten, indem es Rendering-Adapter beim Start erkennt und Dateianfragen anhand des MIME-Typs an den passenden Adapter weiterleitet.

Die Unterstützung für ein neues Dateiformat erfordert lediglich einen neuen Adapter unter `src/adapters/file-reader/<id>/`. Weder Gateway- noch Core-Code muss geändert werden.

## Zuständigkeiten

- Beim Start alle File-Reader-Adapter unter `src/adapters/file-reader/` erkennen.
- Eine Registry pflegen, die MIME-Typen und Erweiterungen dem zuständigen Adapter zuordnet.
- Fähigkeiten bereitstellen, damit andere Gateways und Adapter den richtigen Renderer für einen MIME-Typ ermitteln können.
- Statische Assets und API-Routen der Adapter registrieren, die beim Bootstrap beigesteuert werden.

Nicht zuständig für: Speichern oder Abrufen der eigentlichen Datei-Bytes (das obliegt dem Dateispeicher-Gateway), Durchsetzen von Upload-Größenlimits oder Verwaltung der Dateizugriffssteuerung.

## Architektur

Der Gateway-Einstiegspunkt ist `src/gateways/file-reader/bootstrap.ts`. Beim Start durchsucht er `src/adapters/file-reader/`, importiert das `index.ts` jedes Adapters, ruft `bootstrapFileReaderAdapter(ctx)` auf und sammelt die unterstützten MIME-Typen in der Registry.

Die `FileReaderAdapter`-Schnittstelle in `src/gateways/file-reader/gateway.ts` definiert den Vertrag, den jeder Adapter erfüllen muss:

```ts
interface FileReaderAdapter {
    readonly adapterId: string;
    readonly adapterName: string;
    getSupportedTypes(): Array<{ ext: string; mimeType: string }>;
}
```

Adapter können optional statische Asset-Verzeichnisse und API-Routen registrieren, indem sie während des Bootstraps `ctx.registerAdapterStaticDir()` und `ctx.registerRoute()` aufrufen.

## Erweiterungspunkte

Um einen neuen Datei-Renderer hinzuzufügen:

1. `src/adapters/file-reader/<id>/index.ts` erstellen mit den Exporten `createFileReaderAdapter()` und `bootstrapFileReaderAdapter(ctx)`.
2. Unterstützte MIME-Typen von `getSupportedTypes()` zurückgeben.
3. Eine `file-reader:<id>:ui`-Fähigkeit mit `scriptUrl` und `stylesheetUrl` beitragen, damit die Browserseite das passende Viewer-Skript laden kann.

Das Gateway erkennt den neuen Adapter beim nächsten Start automatisch.
