export interface StoredObject {
    key: string;
    size: number;
    contentType?: string;
    lastModified: Date;
}

export interface FileStorageGateway {
    put(key: string, content: Uint8Array, contentType?: string): Promise<StoredObject>;
    store(userId: string, content: Uint8Array, contentType?: string): Promise<StoredObject>;
    get(key: string): Promise<Uint8Array | null>;
    delete(key: string): Promise<boolean>;
    list(prefix?: string): Promise<StoredObject[]>;
}
