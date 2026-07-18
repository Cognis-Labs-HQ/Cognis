# Namespaced media storage integration

## Whiteboard pasted images use file namespaces

Pasted whiteboard images are uploaded into the `whiteboards` file namespace and saved as whiteboard image URLs instead of embedding the full data URL directly in the scene snapshot.

## Classroom materials expose a namespace client

The classes adapter now binds and contributes its `classes` namespace client so future classroom material APIs use the same namespaced file-storage path from their first write.
