import type { AccessRole, FlowApi } from "@cognis/core";
import { LibraryStore } from "./store.js";
import type {
    LibraryEntry,
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
        private readonly flow?: FlowApi,
        private readonly notifyNewContent?: (input: {
            entryCount: number;
            language?: string;
        }) => Promise<void>,
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
            (await this.store.listPushRequests()).some(
                (request) => request.sourceEntryId === source.id,
            )
        )
            throw new Error("request_pending");
        return this.store.createPush(entryId, normalized, actor.accountId);
    }

    async listPushRequests(
        actor: VisibilityActor,
    ): Promise<LibraryPushRequest[]> {
        const visible: LibraryPushRequest[] = [];
        for (const request of await this.store.listPushRequests()) {
            const source = await this.store.get(request.sourceEntryId);
            if (!source) continue;
            if (request.requestedBy === actor.accountId) {
                visible.push({ ...request, source, canWithdraw: true });
                continue;
            }
            try {
                await this.authorize(actor, request.destination, true);
                visible.push({ ...request, source, canReview: true });
            } catch (error) {
                if (!(error instanceof Error) || error.message !== "forbidden")
                    throw error;
            }
        }
        return visible;
    }

    async reviewPush(
        actor: VisibilityActor,
        requestId: string,
        decision: "approved" | "rejected",
    ): Promise<LibraryPushRequest> {
        const request = await this.pendingRequest(requestId);
        await this.authorize(actor, request.destination, true);
        if (decision === "approved") {
            const source = await this.store.get(request.sourceEntryId);
            if (!source) throw new Error("reference_not_found");
            if (source.protected) throw new Error("protected_content");
            if (
                source.scope !== "user" ||
                source.scopeId !== request.requestedBy
            )
                throw new Error("request_source_moved");
            await this.store.move(source.id, request.destination);
            if (request.destination.scope === "global")
                await this.notifyNewContent?.({ entryCount: 1 });
        }
        await this.store.reviewPush(requestId, decision, actor.accountId);
        return { ...request, status: decision };
    }

    async withdrawPush(
        actor: VisibilityActor,
        requestId: string,
    ): Promise<LibraryPushRequest> {
        const request = await this.pendingRequest(requestId);
        if (request.requestedBy !== actor.accountId)
            throw new Error("forbidden");
        const source = await this.store.get(request.sourceEntryId);
        if (
            !source ||
            source.scope !== "user" ||
            source.scopeId !== actor.accountId
        )
            throw new Error("request_source_moved");
        await this.store.reviewPush(requestId, "withdrawn", actor.accountId);
        return { ...request, status: "withdrawn" };
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
