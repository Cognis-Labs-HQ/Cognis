# Bildanzeige-Adapter

## Überblick

Der Bildanzeige-Adapter ist der File-Reader-Adapter für gängige Raster- und Vektorbild-Formate. Er rendert Bilder direkt in Unterrichtsmaterialien und Dateianhang-Anzeigen, ohne ein separates Seitenladen zu erfordern. Der Viewer unterstützt progressives Laden großer Bilder und nutzt die native Bild-Rendering-Pipeline des Browsers.

## Zuständigkeiten

- Unterstützung für JPEG, PNG, GIF, WebP, SVG und AVIF MIME-Typen beim File-Reader-Gateway registrieren.
- Die Fähigkeit `file-reader:image:ui` bereitstellen, damit die Browserseite das korrekte Viewer-Skript und Stylesheet laden kann.
- Das statische Asset-Verzeichnis des Adapters registrieren, sodass Viewer-Skript und CSS unter `/static/adapters/file-reader/image/` bereitgestellt werden.

Nicht zuständig für: Abrufen der Datei-Bytes (das übernimmt das Dateispeicher-Gateway), Durchsetzen von Dateigrößenlimits oder Bildtransformationen.

## Architektur

`src/adapters/file-reader/image/index.ts` ist die einzige serverseitige Datei und implementiert `FileReaderAdapter` und `bootstrapFileReaderAdapter`.

Die browserseitige Anzeige befindet sich in `src/adapters/file-reader/image/ui/`:

| Datei              | Zweck                                                        |
| ------------------ | ------------------------------------------------------------ |
| `image-viewer.js`  | Bindet das Bildelement in den File-Reader-Host-Container ein |
| `image-viewer.css` | Gestaltung für den Viewer-Container                          |

## Unterstützte Typen

| Erweiterung   | MIME-Typ        |
| ------------- | --------------- |
| `jpg`, `jpeg` | `image/jpeg`    |
| `png`         | `image/png`     |
| `gif`         | `image/gif`     |
| `webp`        | `image/webp`    |
| `svg`         | `image/svg+xml` |
| `avif`        | `image/avif`    |
