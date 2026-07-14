import type {
    FileAccessContext,
    FileObjectAcl,
    FileStorageGateway,
    NamespaceDefinition,
    StoredObject,
} from "@cognis/core";
import { NamespaceRegistry } from "./namespace-registry.js";
import { assertWithinCeiling, canAccess } from "./acl.js";
import { DbFileObjectStore } from "./file-object-store.js";
import type { FileQuotaStore } from "./quota-store-contract.js";

export class QuotaExceededError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "QuotaExceededError";
    }
}

export class AccessDeniedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AccessDeniedError";
    }
}

export interface PutOptions {
    groupIds?: string[];
    publicRead?: boolean;
    contentType?: string;
}

/**
 * Orchestrates namespaced file operations: resolves the namespace
 * definition, enforces the ACL ceiling and cross-component allow-list,
 * enforces per-namespace + global quota, then delegates physical storage to
 * the raw FileStorageGateway adapter and records object metadata/usage.
 *
 * This is the implementation behind the `files:*` capabilities contributed
 * in bootstrap.ts — the sole entry point components should use for file
 * operations. Nothing outside the files gateway should call the raw adapter
 * directly.
 */
export class NamespaceFileService {
    constructor(
        private readonly registry: NamespaceRegistry,
        private readonly rawGateway: FileStorageGateway,
        private readonly objects: DbFileObjectStore,
        private readonly getQuotaStore: () => FileQuotaStore | undefined,
    ) {}

    registerNamespace(definition: NamespaceDefinition): void {
        this.registry.register(definition);
    }

    private resolveNamespace(
        namespaceId: string,
        access: FileAccessContext,
    ): NamespaceDefinition {
        const definition = this.registry.require(namespaceId);
        if (!this.registry.componentAllowed(definition, access.callerComponent)) {
            throw new AccessDeniedError(
                `Component "${access.callerComponent}" is not permitted to access namespace "${namespaceId}".`,
            );
        }
        return definition;
    }

    private async assertWithinQuota(
        access: FileAccessContext,
        namespaceId: string,
        additionalBytes: number,
    ): Promise<void> {
        const quotaStore = this.getQuotaStore();
        if (!quotaStore) return;

        const [namespaceQuota, globalQuota, namespaceUsage, globalUsage] =
            await Promise.all([
                quotaStore.getUserNamespaceQuota(access.actorId, namespaceId),
                quotaStore.getUserGlobalQuota(access.actorId),
                this.objects.getNamespaceUsage(access.actorId, namespaceId),
                this.objects.getGlobalUsage(access.actorId),
            ]);

        if (
            namespaceQuota !== undefined &&
            namespaceUsage + additionalBytes > namespaceQuota
        ) {
            throw new QuotaExceededError(
                `Namespace quota exceeded for "${namespaceId}".`,
            );
        }
        if (
            globalQuota !== undefined &&
            globalUsage + additionalBytes > globalQuota
        ) {
            throw new QuotaExceededError("Global storage quota exceeded.");
        }
    }

    async put(
        namespaceId: string,
        access: FileAccessContext,
        key: string,
        content: Uint8Array,
        options: PutOptions = {},
    ): Promise<StoredObject> {
        const definition = this.resolveNamespace(namespaceId, access);
        const objectAcl: FileObjectAcl = {
            ownerId: access.actorId,
            groupIds: options.groupIds,
            publicRead: options.publicRead,
        };
        assertWithinCeiling(definition.acl, objectAcl);
        await this.assertWithinQuota(access, namespaceId, content.byteLength);

        const stored = await this.rawGateway.put(
            namespaceId,
            key,
            content,
            options.contentType,
        );
        await this.objects.put(namespaceId, stored.key, objectAcl, stored.size);
        return stored;
    }

    async store(
        namespaceId: string,
        access: FileAccessContext,
        content: Uint8Array,
        options: PutOptions = {},
    ): Promise<StoredObject> {
        const definition = this.resolveNamespace(namespaceId, access);
        const objectAcl: FileObjectAcl = {
            ownerId: access.actorId,
            groupIds: options.groupIds,
            publicRead: options.publicRead,
        };
        assertWithinCeiling(definition.acl, objectAcl);
        await this.assertWithinQuota(access, namespaceId, content.byteLength);

        const stored = await this.rawGateway.store(
            namespaceId,
            access.actorId,
            content,
            options.contentType,
        );
        await this.objects.put(namespaceId, stored.key, objectAcl, stored.size);
        return stored;
    }

    async get(
        namespaceId: string,
        access: FileAccessContext,
        key: string,
    ): Promise<Uint8Array | null> {
        const definition = this.resolveNamespace(namespaceId, access);
        const objectAcl = await this.objects.get(namespaceId, key);
        if (!objectAcl) return null;
        if (!canAccess(definition.acl, objectAcl, access)) {
            throw new AccessDeniedError(
                `Actor "${access.actorId}" may not read "${namespaceId}/${key}".`,
            );
        }
        return this.rawGateway.get(namespaceId, key);
    }

    async delete(
        namespaceId: string,
        access: FileAccessContext,
        key: string,
    ): Promise<boolean> {
        const definition = this.resolveNamespace(namespaceId, access);
        const objectAcl = await this.objects.get(namespaceId, key);
        if (!objectAcl) return false;
        if (!canAccess(definition.acl, objectAcl, access)) {
            throw new AccessDeniedError(
                `Actor "${access.actorId}" may not delete "${namespaceId}/${key}".`,
            );
        }
        const deleted = await this.rawGateway.delete(namespaceId, key);
        if (deleted) {
            await this.objects.delete(namespaceId, key);
        }
        return deleted;
    }

    async list(
        namespaceId: string,
        access: FileAccessContext,
        prefix?: string,
    ): Promise<StoredObject[]> {
        const definition = this.resolveNamespace(namespaceId, access);
        const entries = await this.rawGateway.list(namespaceId, prefix);
        const results: StoredObject[] = [];
        for (const entry of entries) {
            const objectAcl = await this.objects.get(namespaceId, entry.key);
            if (objectAcl && canAccess(definition.acl, objectAcl, access)) {
                results.push(entry);
            }
        }
        return results;
    }
}
