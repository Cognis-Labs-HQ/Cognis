import { validateUpdateProposal } from "./proposals.js";
import { validateEntryInput } from "./input.js";
import type { LibraryImages } from "./images.js";
import { LibraryVisibilityService } from "../visibility.js";
import { validateMergeProposal } from "./merge.js";
import {
    validateDependencyVisibility,
    canComposeAtLocation,
} from "./dependencies.js";
import type { LibraryActor, LibraryCapability } from "../contracts.js";
import type { LibraryStore } from "../store.js";
import type { LibrarySchema, LibraryEntry } from "../types.js";
import type { FlowApi } from "@cognis/core";

export function createVisibilityService({
    store,
    read,
    authorize,
    schema,
    update,
    flow,
    removeEntries,
    notifyDeletion,
    validateImages,
    notifyRequest,
    isAvailable,
}: {
    validateImages: LibraryImages["validate"];
    isAvailable?: (entry: LibraryEntry) => boolean;
    notifyRequest?: ConstructorParameters<typeof LibraryVisibilityService>[8];
    store: LibraryStore;
    read: LibraryCapability["read"];
    authorize: ConstructorParameters<typeof LibraryVisibilityService>[2];
    schema(id: string): LibrarySchema;
    update: LibraryCapability["update"];
    flow?: FlowApi;
    removeEntries(
        actor: LibraryActor,
        ids: readonly string[],
        blacklist: boolean,
        reviewed: boolean,
    ): Promise<LibraryEntry[]>;
    notifyDeletion(
        entries: readonly LibraryEntry[],
        actor: LibraryActor,
    ): Promise<void>;
}) {
    return new LibraryVisibilityService(
        store,
        read,
        authorize,
        async (actor, input, destination, sourceId, validateProposal) => {
            if (input.linkedEntries?.length && sourceId) {
                const current = await store.get(sourceId);
                if (!current) throw new Error("entry_not_found");
                await validateMergeProposal(
                    actor,
                    validateProposal ? { ...current, ...destination } : current,
                    input,
                    schema(input.schemaId),
                    read,
                );
                if (validateProposal) {
                    await validateImages(
                        actor,
                        schema(input.schemaId),
                        input.layer,
                        input.fields ?? {},
                        current.fields,
                    );
                    for (const node of input.linkedEntries ?? [])
                        await validateImages(
                            actor,
                            schema(node.entry.schemaId),
                            node.entry.layer,
                            node.entry.fields ?? {},
                        );
                }
                return;
            }
            const targets = await validateDependencyVisibility(
                input,
                destination,
                (id) => read(actor, id),
                sourceId,
                schema(input.schemaId),
            );
            if (!validateProposal) return;
            validateEntryInput(input);
            const current = sourceId ? await store.get(sourceId) : null;
            if (current)
                validateUpdateProposal(
                    current,
                    input,
                    schema(input.schemaId),
                    targets,
                );
            await validateImages(
                actor,
                schema(input.schemaId),
                input.layer,
                input.fields ?? {},
                current?.fields,
            );
        },
        flow,
        update,
        async (actor, source, destination) => {
            const dependents = (await store.referencesFor(source.id)).filter(
                (dependent) =>
                    !canComposeAtLocation(
                        { ...source, ...destination },
                        dependent,
                    ),
            );
            if (!dependents.length) return [];
            const cascadeIds = await store.resolveDeletionCascade(
                dependents.map(({ id }) => id),
                undefined,
                true,
            );
            if (cascadeIds.includes(source.id))
                throw new Error("entry_required_by_shared_content");
            return removeEntries(actor, cascadeIds, false, true);
        },
        notifyDeletion,
        notifyRequest,
        isAvailable,
    );
}
