import {
    allInputReferences,
    canComposeAtLocation,
} from "./service/dependencies.js";
import { runOperation } from "./reuse/operation.js";
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
        private readonly applyUpdate?: (
            actor: VisibilityActor,
            entryId: string,
            input: NonNullable<LibraryPushRequest["proposedEntry"]>,
        ) => Promise<LibraryEntry>,
        private readonly cascadeRelocation?: (
            actor: VisibilityActor,
            source: LibraryEntry,
            destination: LibraryLocation,
        ) => Promise<LibraryEntry[]>,
        private readonly notifyDeletion?: (
            entries: readonly LibraryEntry[],
            actor: VisibilityActor,
        ) => Promise<void>,
    ) {}

    async requestPush(
        actor: VisibilityActor,
        entryId: string,
        destination: LibraryLocation,
    ): Promise<LibraryPushRequest> {
        const source = await this.read(actor, entryId);
        if (!source) throw new Error("not_found");
        if (source.protected) throw new Error("protected_content");
        if (source.createdBy.startsWith("content-pack:"))
            throw new Error("provider_content");
        let normalized: LibraryLocation;
        if (destination.scope === "user") {
            if (source.scope === "user") throw new Error("invalid_destination");
            if (
                source.createdBy !== actor.accountId &&
                actor.role !== "admin" &&
                actor.role !== "owner"
            )
                throw new Error("forbidden");
            if (destination.scopeId && destination.scopeId !== source.createdBy)
                throw new Error("invalid_destination");
            normalized = { scope: "user", scopeId: source.createdBy };
        } else {
            if (source.scope !== "user" || source.scopeId !== actor.accountId)
                throw new Error("forbidden");
            normalized = await this.authorize(actor, destination, false);
        }
        if (
            (await this.store.listPushRequests("pending")).some(
                (request) => request.sourceEntryId === source.id,
            )
        )
            throw new Error("request_pending");
        await this.validateDependencies(actor, source, normalized, source.id);
        return this.store.createPush(entryId, normalized, actor.accountId);
    }

    async requestMerge(
        actor: VisibilityActor,
        entryId: string,
        proposedEntry: LibraryEntryInput,
    ): Promise<LibraryPushRequest> {
        const source = await this.read(actor, entryId);
        if (!source) throw new Error("not_found");
        if (source.protected) throw new Error("protected_content");
        if (source.scope === "user") throw new Error("forbidden");
        if (
            (await this.store.listPushRequests("pending")).some(
                (request) => request.sourceEntryId === entryId,
            )
        )
            throw new Error("request_pending");
        return this.store.createPush(
            entryId,
            { scope: source.scope, scopeId: source.scopeId },
            actor.accountId,
            "merge",
            proposedEntry,
        );
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
        status?: LibraryPushRequest["status"],
    ): Promise<LibraryPushRequest[]> {
        if (
            status !== undefined &&
            !["pending", "approved", "rejected", "withdrawn"].includes(status)
        )
            throw new Error("invalid_request_status");
        const visible: LibraryPushRequest[] = [];
        for (const request of await this.store.listPushRequests(status)) {
            let canReview = false;
            try {
                await this.authorize(
                    actor,
                    request.destination.scope === "user"
                        ? { scope: "global", scopeId: "global" }
                        : request.destination,
                    true,
                );
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
            const source = await this.store.get(request.sourceEntryId);
            visible.push({
                ...request,
                source: source ? (request.sourceSnapshot ?? source) : undefined,
                sourceSnapshot: source ? request.sourceSnapshot : undefined,
                sourceContext: source ? request.sourceContext : undefined,
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
        let deletedEntries: LibraryEntry[] = [];
        const reviewed = await this.store.transaction(async () => {
            const request = await this.pendingRequest(requestId);
            await this.authorize(
                actor,
                request.destination.scope === "user"
                    ? { scope: "global", scopeId: "global" }
                    : request.destination,
                true,
            );
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
                } else if (request.destination.scope === "user") {
                    if (
                        source.scope === "user" ||
                        request.destination.scopeId !== source.createdBy
                    )
                        throw new Error("request_source_moved");
                    if (!this.cascadeRelocation)
                        throw new Error("move_unavailable");
                    await this.validateDependencies(
                        { accountId: source.createdBy, role: "user" },
                        source,
                        request.destination,
                        source.id,
                    );
                    for (const pending of await this.store.listPushRequests(
                        "pending",
                    )) {
                        const candidate =
                            pending.proposedEntry ??
                            (await this.store.get(pending.sourceEntryId));
                        if (
                            candidate &&
                            allInputReferences(candidate).some(
                                ({ entryId }) => entryId === source.id,
                            ) &&
                            !canComposeAtLocation(
                                { ...source, ...request.destination },
                                pending.destination,
                            )
                        )
                            throw new Error("request_pending");
                    }
                    deletedEntries = await this.cascadeRelocation(
                        actor,
                        source,
                        request.destination,
                    );
                    await runOperation(
                        this.flow,
                        "study:library:move",
                        {
                            actor,
                            entry: source,
                            destination: request.destination,
                        },
                        {
                            move: () =>
                                this.store.move(source.id, request.destination),
                        },
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
                    await runOperation(
                        this.flow,
                        "study:library:move",
                        {
                            actor,
                            entry: source,
                            destination: request.destination,
                        },
                        {
                            move: () =>
                                this.store.move(source.id, request.destination),
                        },
                    );
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
        if (deletedEntries.length)
            await this.notifyDeletion?.(deletedEntries, actor);
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
                (request.kind === "update" &&
                    source?.scope === "global" &&
                    source.createdBy === actor.accountId) ||
                (request.kind === "merge" &&
                    !!source &&
                    source.scope !== "user");
            const validPromotionSource =
                source?.scope === "user" && source.scopeId === actor.accountId;
            const validRelocationSource =
                request.destination.scope === "user" &&
                source &&
                source.scope !== "user" &&
                source.createdBy === request.destination.scopeId;
            if (
                !validUpdateSource &&
                !validPromotionSource &&
                !validRelocationSource
            )
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
            let relocated!: LibraryEntry;
            await runOperation(
                this.flow,
                "study:library:move",
                { actor, entry, destination: normalized },
                {
                    move: async () => {
                        relocated = await this.store.move(entry.id, normalized);
                    },
                },
            );
            return relocated;
        });
        return moved;
    }

    async moveToPersonal(
        actor: VisibilityActor,
        entryId: string,
    ): Promise<LibraryPushRequest> {
        return this.requestPush(actor, entryId, { scope: "user" });
    }

    private async pendingRequest(requestId: string) {
        const request = await this.store.getPush(requestId);
        if (!request) throw new Error("not_found");
        if (request.status !== "pending") throw new Error("already_reviewed");
        return request;
    }
}
