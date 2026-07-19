import {
    mkdir,
    readdir,
    readFile,
    rm,
    stat,
    writeFile,
} from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { FileStorageGateway, StoredObject } from "@cognis/core";

const MIME_EXT: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
};

/**
 * Local filesystem implementation of the namespace-scoped FileStorageGateway
 * contract. Every method takes a namespaceId first — the adapter has no
 * concept of ACLs or quotas, it simply confines physical storage to
 * `<rootPath>/<namespaceId>/...`. All ACL/quota enforcement happens one
 * layer up, in the files gateway's namespace file service.
 */
export class LocalFileGateway implements FileStorageGateway {
    constructor(private readonly rootPath: string) {}

    private namespaceRoot(namespaceId: string): string {
        return this.resolveInsideRoot(this.rootPath, namespaceId);
    }

    private resolveInsideRoot(rootPath: string, relativePath: string): string {
        const normalizedRelativePath = String(relativePath ?? "").trim();
        if (
            !normalizedRelativePath ||
            isAbsolute(normalizedRelativePath) ||
            normalizedRelativePath.split(/[\\/]+/).includes("..")
        ) {
            throw new Error("invalid_file_storage_path");
        }
        const root = resolve(rootPath);
        const target = resolve(root, normalizedRelativePath);
        const targetRelativeToRoot = relative(root, target);
        if (
            targetRelativeToRoot.startsWith("..") ||
            isAbsolute(targetRelativeToRoot)
        ) {
            throw new Error("invalid_file_storage_path");
        }
        return target;
    }

    private objectPath(namespaceId: string, key: string): string {
        return this.resolveInsideRoot(this.namespaceRoot(namespaceId), key);
    }

    async put(
        namespaceId: string,
        key: string,
        content: Uint8Array,
        contentType?: string,
    ): Promise<StoredObject> {
        const target = this.objectPath(namespaceId, key);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, content);
        const info = await stat(target);

        return {
            key,
            size: info.size,
            contentType,
            lastModified: info.mtime,
        };
    }

    async store(
        namespaceId: string,
        actorId: string,
        content: Uint8Array,
        contentType?: string,
    ): Promise<StoredObject> {
        const ext = contentType
            ? (MIME_EXT[contentType.toLowerCase()] ?? "")
            : "";
        const filename = ext ? `${randomUUID()}.${ext}` : randomUUID();
        const key = `${actorId}/${filename}`;
        return this.put(namespaceId, key, content, contentType);
    }

    async get(namespaceId: string, key: string): Promise<Uint8Array | null> {
        const target = this.objectPath(namespaceId, key);

        try {
            return await readFile(target);
        } catch {
            return null;
        }
    }

    async delete(namespaceId: string, key: string): Promise<boolean> {
        const target = this.objectPath(namespaceId, key);
        try {
            await rm(target);
            return true;
        } catch {
            return false;
        }
    }

    async list(namespaceId: string, prefix = ""): Promise<StoredObject[]> {
        const baseDir = prefix
            ? this.objectPath(namespaceId, prefix)
            : this.namespaceRoot(namespaceId);
        try {
            const entries = await readdir(baseDir, { withFileTypes: true });
            const files = entries.filter((entry) => entry.isFile());

            return Promise.all(
                files.map(async (entry) => {
                    const relative = prefix
                        ? `${prefix}/${entry.name}`
                        : entry.name;
                    const fullPath = this.objectPath(namespaceId, relative);
                    const info = await stat(fullPath);
                    return {
                        key: relative,
                        size: info.size,
                        lastModified: info.mtime,
                    };
                }),
            );
        } catch {
            return [];
        }
    }
}
