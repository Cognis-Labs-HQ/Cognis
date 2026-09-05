/**
 * Core contracts for the file storage gateway surface.
 *
 * These types define the cross-component API for file storage. Gateway
 * implementations and adapters must implement/consume these interfaces rather
 * than importing each other's internal types directly.
 *
 * Namespaces:
 *   All stored objects live inside a namespace (e.g. "default", "user",
 *   "profile"). A namespace is registered once by its owning component via
 *   the `files:registerNamespace` capability and declares a `NamespaceAcl`
 *   ceiling that bounds what any object inside it may grant. File adapters
 *   (FileStorageGateway implementations) are namespace-scoped: every method
 *   takes the namespace id as its first argument and keys are relative to
 *   that namespace. Creating a file without a namespace is not supported.
 */

export interface StoredObject {
    /** Key relative to the namespace it was stored in. */
    key: string;
    size: number;
    contentType?: string;
    lastModified: Date;
}

/**
 * Ceiling tiers a namespace can declare for the objects it contains:
 *   - "private-owner": every object is visible only to its owner, regardless
 *     of any groupIds/publicRead the object claims (e.g. the "user" namespace).
 *   - "private-group": an object's owner or listed groupIds members may
 *     access it; publicRead is not permitted.
 *   - "component-managed": the owning component may grant owner, group, or
 *     public read access per object (e.g. "profile", "default").
 */
export type NamespaceVisibility =
    "private-owner" | "private-group" | "component-managed";

export interface NamespaceAcl {
    visibility: NamespaceVisibility;
}

/**
 * Per-object access grant, supplied by the owning component when the object
 * is written. Always bounded by the namespace's NamespaceAcl ceiling — an
 * object may never claim broader access than its namespace permits.
 */
export interface FileObjectAcl {
    ownerId: string;
    /** Opaque collaborator IDs (e.g. a chat room or class roster). */
    groupIds?: string[];
    publicRead?: boolean;
}

export interface NamespaceDefinition {
    id: string;
    /** Component id that owns and registered this namespace. */
    ownerComponent: string;
    acl: NamespaceAcl;
    /**
     * Component ids (besides the owner) permitted to call files:* against
     * this namespace. "core" is always implicitly permitted.
     */
    allowComponents?: string[];
}

/** Identifies the caller making a namespaced file operation. */
export interface FileAccessContext {
    actorId: string;
    role?: string;
    /** Component id making the call. "core" is always permitted. */
    callerComponent: string;
}

export interface NamespaceFileWriteOptions {
    groupIds?: string[];
    publicRead?: boolean;
    contentType?: string;
}

export interface NamespaceFileClientAccess {
    actorId: string;
    role?: string;
}

/**
 * Namespace-bound file client exposed through ctx for component consumers.
 * Components bind their namespace and component id once, then pass only the
 * acting user and object details for each operation. This keeps namespace
 * selection explicit at component bootstrap while avoiding repeated
 * namespace/caller plumbing at every file operation call site.
 */
export interface NamespaceFileClient {
    put(
        access: NamespaceFileClientAccess,
        key: string,
        content: Uint8Array,
        options?: NamespaceFileWriteOptions,
    ): Promise<StoredObject>;
    store(
        access: NamespaceFileClientAccess,
        content: Uint8Array,
        options?: NamespaceFileWriteOptions,
    ): Promise<StoredObject>;
    get(
        access: NamespaceFileClientAccess,
        key: string,
    ): Promise<Uint8Array | null>;
    delete(access: NamespaceFileClientAccess, key: string): Promise<boolean>;
    list(
        access: NamespaceFileClientAccess,
        prefix?: string,
    ): Promise<StoredObject[]>;
}

export interface NamespaceFileClientRequest {
    namespaceId: string;
    callerComponent: string;
}

export type FileCollection =
    "all" | "favorites" | "recent" | "shared" | "trash";

export interface VirtualFileEntry extends StoredObject {
    namespaceId: string;
    providerId: string;
    folderId: string | null;
    favorite: boolean;
    lastOpenedAt: string | null;
}

export interface VirtualFolder {
    id: string;
    name: string;
    namespaceId: string;
    classId?: string;
}

/** Request passed to the renderer-neutral file-open capability. */
export interface FileOpenRequest {
    namespaceId: string;
    key: string;
    actorId: string;
    callerComponent: string;
    rendererId?: string;
}

/** Factory capability contributed as `files:namespace`. */
export type NamespaceFileClientFactory = (
    request: NamespaceFileClientRequest,
) => NamespaceFileClient;

/**
 * Namespace-scoped file storage adapter contract. Implementations receive an
 * already-validated namespace id (ACL/quota checks happen in the files
 * gateway layer, above the adapter) and are only responsible for physical
 * storage within that namespace.
 */
export interface FileStorageGateway {
    put(
        namespaceId: string,
        key: string,
        content: Uint8Array,
        contentType?: string,
    ): Promise<StoredObject>;
    store(
        namespaceId: string,
        actorId: string,
        content: Uint8Array,
        contentType?: string,
    ): Promise<StoredObject>;
    get(namespaceId: string, key: string): Promise<Uint8Array | null>;
    delete(namespaceId: string, key: string): Promise<boolean>;
    list(namespaceId: string, prefix?: string): Promise<StoredObject[]>;
}
