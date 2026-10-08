import {
    allInputReferences,
    canComposeAtLocation,
} from "./service/dependencies.js";
import type { AccessRole, FlowApi } from "@cognis/core";
import { LibraryStore } from "./store.js";
import type {
    LibraryEntry,
    LibraryEntryInput,
    LibraryLocation,
    LibraryPushRequest,
} from "./types.js";

interface VisibilityActor {
    accountId: string;
    role: AccessRole;
}

type Authorize = (
    actor: VisibilityActor,
    location: LibraryLocation,
    write: boolean,
) => Promise<LibraryLocation>;

export class LibraryVisibilityService {
    constructor(
        private readonly store: LibraryStore,
        private readonly read: (
            actor: VisibilityActor,
            entryId: string,
        ) => Promise<LibraryEntry | null>,
        private readonly authorize: Authorize,
        private readonly validateDependencies: (
            actor: VisibilityActor,
            input: LibraryEntryInput,
            destination: LibraryLocation,
            sourceId?: string,
        ) => Promise<void>,
        private readonly flow?: FlowApi,
        private readonly notifyNewContent?: (input: {
            entryCount: number;
            language?: string;
        }) => Promise<void>,
        private readonly applyUpdate?: (
            actor: VisibilityActor,
            entryId: string,
            input: NonNullable<LibraryPushRequest["proposedEntry"]>,
        ) => Promise<LibraryEntry>,
    ) {}

    async requestPush(
        actor: VisibilityActor,
        entryId: string,
        destination: LibraryLocation,
    ): Promise<LibraryPushRequest> {
        const source = await this.read(actor, entryId);
        if (!source) throw new Error("not_found");
        if (source.protected) throw new Error("protected_content");
        if (source.scope !== "user" || source.scopeId !== actor.accountId)
            throw new Error("forbidden");
        if (destination.scope === "user")
            throw new Error("invalid_destination");
        const normalized = await this.authorize(actor, destination, false);
        if (
            (await this.store.listPushRequests("pending")).some(
                (request) => request.sourceEntryId === source.id,
            )
        )
            throw new Error("request_pending");
        await this.validateDependencies(actor, source, normalized, source.id);
        return this.store.createPush(entryId, normalized, actor.accountId);
    }

    async requestUpdate(
        actor: VisibilityActor,
        entryId: string,
        proposedEntry: NonNullable<LibraryPushRequest["proposedEntry"]>,
    ): Promise<LibraryPushRequest> {
        const source = await this.read(actor, entryId);
        if (!source) throw new Error("not_found");
        if (source.protected) throw new Error("protected_content");
        if (source.scope !== "global" || source.createdBy !== actor.accountId)
            throw new Error("forbidden");
        if (
            (await this.store.listPushRequests("pending")).some(
                (request) => request.sourceEntryId === source.id,
            )
        )
            throw new Error("request_pending");
        if (
            proposedEntry.schemaId !== source.schemaId ||
            proposedEntry.layer !== source.layer
        )
            throw new Error("entry_identity_immutable");
        await this.validateDependencies(
            actor,
            proposedEntry,
            {
                scope: "global",
                scopeId: "global",
            },
            source.id,
        );
        return this.store.createPush(
            entryId,
            { scope: "global", scopeId: "global" },
            actor.accountId,
            "update",
            proposedEntry,
        );
    }

    async listPushRequests(
        actor: VisibilityActor,
    ): Promise<LibraryPushRequest[]> {
        const visible: LibraryPushRequest[] = [];
        for (const request of await this.store.listPushRequests()) {
            const source = await this.store.get(request.sourceEntryId);
            let canReview = false;
            try {
                await this.authorize(actor, request.destination, true);
                canReview = true;
            } catch (error) {
                if (
                    !(error instanceof Error) ||
                    !["forbidden", "class_access_unavailable"].includes(
                        error.message,
                    )
                )
                    throw error;
            }
            const owned = request.requestedBy === actor.accountId;
            if (!owned && !canReview) continue;
            visible.push({
                ...request,
                source: request.sourceSnapshot ?? source ?? undefined,
                canReview:
                    canReview && !!source && request.status === "pending",
                canWithdraw: owned && !!source && request.status === "pending",
            });
        }
        return visible;
    }

    async reviewPush(
        actor: VisibilityActor,
        requestId: string,
        decision: "approved" | "rejected",
    ): Promise<LibraryPushRequest> {
        const reviewed = await this.store.transaction(async () => {
            const request = await this.pendingRequest(requestId);
            await this.authorize(actor, request.destination, true);
            await this.store.reviewPush(requestId, decision, actor.accountId);
            if (decision === "approved") {
                const source = await this.store.get(request.sourceEntryId);
                if (!source) throw new Error("reference_not_found");
                if (
                    request.sourceSnapshot?.updatedAt &&
                    request.sourceSnapshot.updatedAt !== source.updatedAt
                )
                    throw new Error("request_source_changed");
                if (source.protected) throw new Error("protected_content");
                if (
                    ["update", "merge"].includes(request.kind ?? "") &&
                    request.proposedEntry
                ) {
                    if (!this.applyUpdate)
                        throw new Error("update_unavailable");
                    await this.validateDependencies(
                        actor,
                        request.proposedEntry,
                        request.destination,
                        source.id,
                    );
                    await this.applyUpdate(
                        actor,
                        request.sourceEntryId,
                        request.proposedEntry,
                    );
                } else if (
                    source.scope !== "user" ||
                    source.scopeId !== request.requestedBy
                )
                    throw new Error("request_source_moved");
                else {
                    await this.validateDependencies(
                        actor,
                        source,
                        request.destination,
                    );
                    await this.store.move(source.id, request.destination);
                }
            }
            return {
                ...request,
                status: decision,
                reviewedBy: actor.accountId,
                reviewedAt: new Date().toISOString(),
                canReview: false,
                canWithdraw: false,
            };
        });
        if (
            decision === "approved" &&
            reviewed.destination.scope === "global" &&
            reviewed.kind !== "update" &&
            reviewed.kind !== "merge"
        )
            await this.notifyNewContent?.({ entryCount: 1 });
        return reviewed;
    }

    async withdrawPush(
        actor: VisibilityActor,
        requestId: string,
    ): Promise<LibraryPushRequest> {
        return this.store.transaction(async () => {
            const request = await this.pendingRequest(requestId);
            if (request.requestedBy !== actor.accountId)
                throw new Error("forbidden");
            const source = await this.store.get(request.sourceEntryId);
            const validUpdateSource =
                request.kind === "update" &&
                source?.scope === "global" &&
                source.createdBy === actor.accountId;
            const validPromotionSource =
                source?.scope === "user" && source.scopeId === actor.accountId;
            if (!validUpdateSource && !validPromotionSource)
                throw new Error("request_source_moved");
            await this.store.reviewPush(
                requestId,
                "withdrawn",
                actor.accountId,
            );
            return {
                ...request,
                status: "withdrawn",
                reviewedBy: actor.accountId,
                reviewedAt: new Date().toISOString(),
                canReview: false,
                canWithdraw: false,
            };
        });
    }

    async relocate(
        actor: VisibilityActor,
        entryId: string,
        destination: LibraryLocation,
    ): Promise<LibraryEntry> {
        if (actor.role !== "admin" && actor.role !== "owner")
            throw new Error("forbidden");
        if (destination.scope === "user")
            throw new Error("invalid_destination");
        const moved = await this.store.transaction(async () => {
            const entry = await this.read(actor, entryId);
            if (!entry) throw new Error("not_found");
            if (entry.protected) throw new Error("protected_content");
            if (entry.createdBy.startsWith("content-pack:"))
                throw new Error("provider_content");
            if (entry.scope !== "user") throw new Error("invalid_destination");
            await this.authorize(actor, entry, true);
            const normalized = await this.authorize(actor, destination, true);
            if (
                (await this.store.listPushRequests("pending")).some(
                    ({ sourceEntryId }) => sourceEntryId === entry.id,
                )
            )
                throw new Error("request_pending");
            await this.validateDependencies(actor, entry, normalized, entry.id);
            await this.flow?.run("study:library:move", {
                actor,
                entry,
                destination: normalized,
            });
            return this.store.move(entry.id, normalized);
        });
        if (moved.scope === "global")
            await this.notifyNewContent?.({ entryCount: 1 });
        return moved;
    }

    async moveToPersonal(
        actor: VisibilityActor,
        entryId: string,
    ): Promise<LibraryEntry> {
        const entry = await this.read(actor, entryId);
        if (!entry) throw new Error("not_found");
        if (entry.protected) throw new Error("protected_content");
        if (entry.createdBy.startsWith("content-pack:"))
            throw new Error("provider_content");
        await this.authorize(
            actor,
            { scope: entry.scope, scopeId: entry.scopeId },
            true,
        );
        if (entry.scope === "user") throw new Error("invalid_destination");
        const destination = {
            scope: "user",
            scopeId: entry.createdBy,
        } as const;
        const requests = await this.store.listPushRequests("pending");
        if (requests.some(({ sourceEntryId }) => sourceEntryId === entry.id))
            throw new Error("request_pending");
        for (const request of requests) {
            const candidate =
                request.proposedEntry ??
                (await this.store.get(request.sourceEntryId));
            if (
                candidate &&
                allInputReferences(candidate).some(
                    ({ entryId }) => entryId === entry.id,
                ) &&
                !canComposeAtLocation(
                    { ...entry, ...destination },
                    request.destination,
                )
            )
                throw new Error("request_pending");
        }
        for (const dependent of await this.store.referencesFor(entry.id)) {
            if (!canComposeAtLocation({ ...entry, ...destination }, dependent))
                throw new Error("entry_required_by_shared_content");
        }
        await this.validateDependencies(
            { accountId: entry.createdBy, role: "user" },
            entry,
            destination,
            entry.id,
        );
        await this.flow?.run("study:library:move", {
            actor,
            entry,
            destination,
        });
        return this.store.move(entry.id, destination);
    }

    private async pendingRequest(requestId: string) {
        const request = await this.store.getPush(requestId);
        if (!request) throw new Error("not_found");
        if (request.status !== "pending") throw new Error("already_reviewed");
        return request;
    }
}
