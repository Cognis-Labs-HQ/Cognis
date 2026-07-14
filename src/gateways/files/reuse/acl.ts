import type {
    FileAccessContext,
    FileObjectAcl,
    NamespaceAcl,
} from "@cognis/core";

/**
 * Enforces the namespace ACL ceiling described in
 * src/core/contracts/files-gateway.ts. Two responsibilities:
 *
 *   assertWithinCeiling — called when an object is written. Rejects an
 *   object ACL that claims broader access than its namespace's visibility
 *   tier permits (e.g. publicRead inside a "private-owner" namespace).
 *
 *   canAccess — called when an object is read/deleted. Resolves whether the
 *   given access context (actor) may reach the object, honoring the
 *   namespace ceiling first and the object's own grant second.
 */

export class AclCeilingViolationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AclCeilingViolationError";
    }
}

export function assertWithinCeiling(
    namespaceAcl: NamespaceAcl,
    objectAcl: FileObjectAcl,
): void {
    if (namespaceAcl.visibility === "private-owner") {
        if (
            (objectAcl.groupIds && objectAcl.groupIds.length > 0) ||
            objectAcl.publicRead
        ) {
            throw new AclCeilingViolationError(
                'Objects in a "private-owner" namespace may not declare groupIds or publicRead.',
            );
        }
    }

    if (namespaceAcl.visibility === "private-group") {
        if (objectAcl.publicRead) {
            throw new AclCeilingViolationError(
                'Objects in a "private-group" namespace may not declare publicRead.',
            );
        }
    }
}

export function canAccess(
    namespaceAcl: NamespaceAcl,
    objectAcl: FileObjectAcl,
    access: FileAccessContext,
): boolean {
    if (access.actorId === objectAcl.ownerId) return true;

    if (namespaceAcl.visibility === "private-owner") {
        return false;
    }

    if (namespaceAcl.visibility === "private-group") {
        return objectAcl.groupIds?.includes(access.actorId) ?? false;
    }

    // component-managed: owner, group membership, or explicit public read.
    if (objectAcl.publicRead) return true;
    return objectAcl.groupIds?.includes(access.actorId) ?? false;
}
