/**
 * Core contracts for the file storage gateway surface.
 *
 * These types define the cross-component API for file storage. Gateway
 * implementations and adapters must implement/consume these interfaces rather
 * than importing each other's internal types directly.
 */

export interface StoredObject {
    key: string;
    size: number;
    contentType?: string;
    lastModified: Date;
}

export interface FileStorageGateway {
    put(
        key: string,
        content: Uint8Array,
        contentType?: string,
    ): Promise<StoredObject>;
    store(
        userId: string,
        content: Uint8Array,
        contentType?: string,
    ): Promise<StoredObject>;
    get(key: string): Promise<Uint8Array | null>;
    delete(key: string): Promise<boolean>;
    list(prefix?: string): Promise<StoredObject[]>;
}
