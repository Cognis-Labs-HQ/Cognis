import { randomUUID } from "node:crypto";
import type { FlowApi } from "@cognis/core";
import type {
    LibraryEntry,
    LibraryEntryInput,
    LibraryLocation,
    LibrarySchema,
} from "../types.js";
import type { LibraryActor } from "../contracts.js";
import type { LibraryStore } from "../store.js";
import { findContentConflict } from "./content-conflicts.js";
import { prepareDefinitionFields } from "./definitions.js";
import { definitionTranslations } from "../reuse/definitions.js";
import { runOperation } from "../reuse/operation.js";
import {
    validateEntryInput,
    validateEntryFields,
    normalizeEntryClass,
} from "./input.js";
import { findLayer, validateReferences } from "../layers.js";
import { isImmutableLayer } from "../immutability.js";
import {
    validateDependencyVisibility,
    validatePendingPublicationEdits,
} from "./dependencies.js";
import type { LibraryContentNotifier } from "../contracts.js";
import type { StringLocalizationCapability } from "../types.js";

interface EntryWriterContext {
    store: LibraryStore;
    flow?: FlowApi;
    schema(id: string, version?: number): LibrarySchema;
    authorize(
        actor: LibraryActor,
        location: LibraryLocation,
        write: boolean,
    ): Promise<LibraryLocation>;
    read(actor: LibraryActor, id: string): Promise<LibraryEntry | null>;
    entryWithPermissions(
        actor: LibraryActor,
        entry: LibraryEntry,
    ): Promise<LibraryEntry> | LibraryEntry;
    stringLocalization?: StringLocalizationCapability;
    notifyNewContent?: LibraryContentNotifier;
}

export class LibraryEntryWriter {
    constructor(private readonly context: EntryWriterContext) {}
    async create(
        actor: LibraryActor,
        raw: LibraryLocation,
        input: LibraryEntryInput,
        allocatedId?: string,
        candidates?: Map<string, LibraryEntry>,
    ): Promise<LibraryEntry> {
        const location = await this.context.authorize(actor, raw, true);
        const schema = this.context.schema(input.schemaId, input.schemaVersion);
        let created!: LibraryEntry;
        let fields: Record<string, unknown>;
        let references: NonNullable<LibraryEntryInput["references"]>;
        let entryId: string | undefined = allocatedId;
        await runOperation(
            this.context.flow,
            "study:library:create",
            { actor, location, entry: input },
            {
                normalize: () => {
                    validateEntryInput(input);
                },
                validate: async () => {
                    fields = structuredClone(input.fields ?? {});
                    references = input.references ?? [];
                    validateEntryInput(input);
                    const layer = findLayer(schema, input.layer);
                    if (isImmutableLayer(layer))
                        throw new Error("immutable_layer");
                    normalizeEntryClass(input, layer);

                    const conflict = await findContentConflict(
                        this.context.store,
                        location,
                        schema.id,
                        input,
                        schema,
                    );
                    if (conflict)
                        throw new Error(`content_conflict:${conflict.id}`);
                    if (layer.semanticRole === "definition") {
                        entryId ??= randomUUID();
                        await prepareDefinitionFields(
                            layer,
                            fields,
                            entryId,
                            input.definitionLanguages ?? [],
                            this.context.stringLocalization,
                        );
                    }

                    validateEntryFields(schema, input.layer, fields);
                    const targets = await validateDependencyVisibility(
                        input,
                        location,
                        async (id) =>
                            candidates?.get(id) ??
                            (await this.context.read(actor, id)),
                    );
                    validateReferences(
                        schema,
                        input.layer,
                        references,
                        targets,
                        input.referenceGroups,
                        fields,
                    );
                },
                persist: async () => {
                    created = await this.context.store.create(
                        location,
                        {
                            ...input,
                            definitionLanguages: undefined,
                            allowConflict: undefined,
                            schemaVersion: schema.version,
                            label: input.label.trim(),
                            fields,
                            references,
                        },
                        schema.language,
                        actor.accountId,
                        entryId,
                    );
                },
            },
        );
        if (location.scope === "global" && !candidates && !input.hidden)
            await this.context.notifyNewContent?.({
                entryCount: 1,
                language: schema.language,
            });
        return this.context.entryWithPermissions(actor, created);
    }

    async update(
        actor: LibraryActor,
        entryId: string,
        input: LibraryEntryInput,
        candidates?: Map<string, LibraryEntry>,
    ): Promise<LibraryEntry> {
        const current = await this.context.read(actor, entryId);
        if (!current) throw new Error("entry_not_found");
        if (
            (current.protected || current.editable === false) &&
            actor.role !== "admin" &&
            actor.role !== "owner"
        )
            throw new Error("entry_not_editable");
        await this.context.authorize(
            actor,
            { scope: current.scope, scopeId: current.scopeId },
            true,
        );
        let updated!: LibraryEntry;
        let fields: Record<string, unknown>;
        let references: NonNullable<LibraryEntryInput["references"]>;
        await runOperation(
            this.context.flow,
            "study:library:update",
            { actor, entry: current, proposedEntry: input },
            {
                validate: async () => {
                    if (
                        input.schemaId !== current.schemaId ||
                        input.layer !== current.layer
                    )
                        throw new Error("entry_identity_immutable");
                    validateEntryInput(input);
                    const schema = this.context.schema(current.schemaId);
                    input.schemaVersion = schema.version;
                    const layer = findLayer(schema, input.layer);
                    if (isImmutableLayer(layer))
                        throw new Error("immutable_layer");
                    normalizeEntryClass(input, layer);

                    fields = structuredClone(input.fields ?? {});
                    for (const field of layer.fields ?? []) {
                        if (
                            field.input?.immutable === true &&
                            JSON.stringify(fields[field.id]) !==
                                JSON.stringify(current.fields?.[field.id])
                        )
                            throw new Error(`field_immutable:${field.id}`);
                    }

                    if (layer.semanticRole === "definition") {
                        const localization = layer.definitionLocalization!;
                        fields[localization.stringKeyField] =
                            current.fields[localization.stringKeyField];
                        definitionTranslations(
                            fields[localization.translationsField],
                        );
                    }

                    references = input.references ?? [];
                    validateEntryFields(schema, input.layer, fields);
                    const targets = await validateDependencyVisibility(
                        input,
                        { scope: current.scope, scopeId: current.scopeId },
                        async (id) =>
                            candidates?.get(id) ??
                            (await this.context.read(actor, id)),
                        entryId,
                        schema,
                    );
                    validateReferences(
                        schema,
                        input.layer,
                        references,
                        targets,
                        input.referenceGroups,
                        fields,
                    );
                    await validatePendingPublicationEdits(
                        await this.context.store.listPushRequests("pending"),
                        current.id,
                        input,
                        async (id) =>
                            candidates?.get(id) ??
                            (await this.context.read(actor, id)),
                        schema,
                    );
                },
                persist: async () => {
                    updated = await this.context.store.update(
                        entryId,
                        {
                            ...input,
                            label: input.label.trim(),
                            fields,
                            references,
                        },
                        current.sourceRecordId !== undefined,
                    );
                },
            },
        );
        return this.context.entryWithPermissions(actor, updated);
    }
}
