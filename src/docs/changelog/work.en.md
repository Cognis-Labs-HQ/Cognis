# Namespace File Clients

## Namespace-bound file clients

The files gateway now exposes `files:namespace`, a ctx capability that returns a client bound to a component and namespace so routine file operations no longer repeat namespace and caller metadata at every call site.

## Share gateway controls

Added share-gateway owned controls for read/write permissions, in-app users, groups/classes, email recipients, password-protected links, generated passwords, editable expiry/permission updates, and readonly watermark metadata. Jitsi Meet and Nextcloud Whiteboard now create/list/delete shares through the generic Share gateway token routes instead of module-specific share endpoints.
