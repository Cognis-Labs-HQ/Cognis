# File Reader Gateway

## Overview

The File Reader Gateway provides a unified, adapter-driven mechanism for rendering files inside Cognis — classroom materials, uploaded attachments, and any resource a user opens in-app. It decouples the rest of the platform from any specific file format by discovering rendering adapters at startup and routing file-open requests to the appropriate one based on MIME type.

Adding support for a new file format (PDF, video, spreadsheet) requires only a new adapter under `src/adapters/file-reader/<id>/`. No gateway or core code changes are needed.

## Responsibilities

- Discover all file-reader adapters at startup by scanning `src/adapters/file-reader/`.
- Maintain a registry mapping MIME types and extensions to the adapter that handles them.
- Expose capabilities so other gateways and adapters can look up the correct renderer for a given MIME type.
- Register adapter-owned static assets and API routes contributed during adapter bootstrap.

Not responsible for: storing or retrieving the actual file bytes (that is the file-storage gateway's concern), enforcing upload size limits, or managing file access control.

## Architecture

The gateway entry point is `src/gateways/file-reader/bootstrap.ts`. At startup it scans `src/adapters/file-reader/`, imports each adapter's `index.ts`, calls `bootstrapFileReaderAdapter(ctx)`, and collects the adapter's supported MIME types into the registry.

The `FileReaderAdapter` interface in `src/gateways/file-reader/gateway.ts` defines the contract every adapter must implement:

```ts
interface FileReaderAdapter {
    readonly adapterId: string;
    readonly adapterName: string;
    getSupportedTypes(): Array<{ ext: string; mimeType: string }>;
}
```

Adapters may optionally register static asset directories and API routes by calling `ctx.registerAdapterStaticDir()` and `ctx.registerRoute()` during bootstrap. The gateway provides these helpers through the `FileReaderAdapterBootstrapCtx` interface.

## Extension Points

To add a new file renderer:

1. Create `src/adapters/file-reader/<id>/index.ts` exporting `createFileReaderAdapter()` and `bootstrapFileReaderAdapter(ctx)`.
2. Return the supported MIME types from `getSupportedTypes()`.
3. Contribute a `file-reader:<id>:ui` capability with `scriptUrl` and `stylesheetUrl` so the browser side knows which viewer script to load.

The gateway discovers the new adapter automatically on next startup — no registration in the gateway itself is required.
