# Text / Markdown Adapter

## Overview

The Text adapter is the file-reader adapter for plain text and Markdown files. Inside a classroom, it doubles as the Notepad — a rich-text editor that teachers and students use to write, format, and save notes directly to class materials. The same adapter handles both read-only file viewing and interactive note editing, keeping the two surfaces consistent.

The adapter registers a server-side route for reading and writing classroom notepad content and contributes a browser-side viewer/editor loaded by the file-reader gateway when a plain-text or Markdown resource is opened.

## Responsibilities

- Register support for `text/plain` and `text/markdown` MIME types with the file-reader gateway.
- Expose classroom notepad read/write routes for authenticated users.
- Contribute the `file-reader:text:ui` capability with the viewer script, stylesheet, and string bundle base URL.
- Normalise and bound the `TEXT_FILE_READER_MAX_BYTES` environment variable within safe limits.

Not responsible for: storing the underlying file bytes (the file-storage gateway handles that), enforcing upload size limits at ingress, or rendering formats other than text and Markdown.

## Architecture

`src/adapters/file-reader/text/index.ts` handles bootstrap: it resolves the optional route context from `auth:routeContext`, applies the `TEXT_FILE_READER_MAX_BYTES` override, and registers the notepad API routes under the study gateway namespace.

Route logic lives in `src/adapters/file-reader/text/routes/index.ts` and delegates persistence to the classes store.

The browser-side notepad lives in `src/adapters/file-reader/text/ui/`:

| File                      | Purpose                                                      |
| ------------------------- | ------------------------------------------------------------ |
| `classroom-notepad.js`    | Rich-text editor and notepad UI mounted inside the classroom |
| `classes-notepad.css`     | Scoped styles for the notepad component                      |
| `languages/*/strings.xml` | Per-language UI strings for all four supported languages     |

## Configuration

| Variable                     | Default           | Description                                                                                      |
| ---------------------------- | ----------------- | ------------------------------------------------------------------------------------------------ |
| `TEXT_FILE_READER_MAX_BYTES` | `262144` (256 KB) | Maximum byte size of a text file the adapter will open or accept. Clamped to `[16384, 4194304]`. |

## API Routes

| Method | Path                                | Description                                 | Auth     |
| ------ | ----------------------------------- | ------------------------------------------- | -------- |
| `GET`  | `/api/v1/study/classes/:id/notepad` | Fetch the current classroom notepad content | Required |
| `PUT`  | `/api/v1/study/classes/:id/notepad` | Save notepad content to class materials     | Required |
