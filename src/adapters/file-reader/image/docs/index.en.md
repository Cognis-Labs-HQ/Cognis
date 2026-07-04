# Image Viewer Adapter

## Overview

The Image Viewer adapter is the file-reader adapter for common raster and vector image formats. It renders images inline inside classroom materials and file-attachment viewers without requiring a separate page load. The viewer supports progressive loading for large images and respects the browser's native image rendering pipeline.

## Responsibilities

- Register support for JPEG, PNG, GIF, WebP, SVG, and AVIF MIME types with the file-reader gateway.
- Contribute the `file-reader:image:ui` capability so the browser side can load the correct viewer script and stylesheet.
- Register the adapter's static asset directory so the viewer script and CSS are served at `/static/adapters/file-reader/image/`.

Not responsible for: fetching the file bytes (the file-storage gateway handles that), enforcing file size limits, or any form of image transformation or compression.

## Architecture

`src/adapters/file-reader/image/index.ts` is the only server-side file. It implements `FileReaderAdapter` and `bootstrapFileReaderAdapter`.

The browser-side viewer lives in `src/adapters/file-reader/image/ui/`:

| File               | Purpose                                                        |
| ------------------ | -------------------------------------------------------------- |
| `image-viewer.js`  | Mounts the image element inside the file-reader host container |
| `image-viewer.css` | Scoped styles for the viewer container                         |

## Supported Types

| Extension     | MIME Type       |
| ------------- | --------------- |
| `jpg`, `jpeg` | `image/jpeg`    |
| `png`         | `image/png`     |
| `gif`         | `image/gif`     |
| `webp`        | `image/webp`    |
| `svg`         | `image/svg+xml` |
| `avif`        | `image/avif`    |
