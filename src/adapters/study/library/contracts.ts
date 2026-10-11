import type { AccessRole } from "@cognis/core";
import type {
    LibraryAsset,
    LibraryContentPackPlan,
    LibraryContentPackReceipt,
    LibraryEntry,
    LibraryEntryInput,
    LibraryEntryFilters,
    LibraryFormContribution,
    LibraryLocation,
    LibraryLookupProvider,
    LibraryLookupSuggestion,
    LibraryMetadata,
    LibraryPushRequest,
    LibraryResolutionProposal,
    LibrarySchema,
} from "./types.js";

export interface LibraryActor {
    accountId: string;
    role: AccessRole;
}

export interface LibraryClassAccess {
    canRead(
        classId: string,
        accountId: string,
        role: AccessRole,
    ): Promise<boolean>;
    canWrite(
        classId: string,
        accountId: string,
        role: AccessRole,
    ): Promise<boolean>;
    listReadable?(
        accountId: string,
        role: AccessRole,
        language?: string,
    ): Promise<string[]>;
    listWritable?(
        accountId: string,
        role: AccessRole,
        language?: string,
    ): Promise<string[]>;
}

export type LibraryContentNotifier = (input: {
    entryCount: number;
    language?: string;
}) => Promise<void>;

/** Public surface used by language modules during their bootstrap. */
export interface LibraryProviderCapability {
    /** Validate a provider pack against the installed contract without mutating storage. */
    inspectContentPack(root: string): Promise<LibraryContentPackPlan>;
    ingestContentPack(root: string): Promise<LibraryContentPackReceipt>;
    registerConstructor(contribution: LibraryFormContribution): () => void;
    /** Register enrichment such as provider-sourced stroke patterns for a label. */
    registerLookupProvider(provider: LibraryLookupProvider): () => void;
}

export interface LibraryCapability {
    registerSchema(schema: LibrarySchema): Promise<void>;
    registerLookupProvider(provider: LibraryLookupProvider): () => void;
    listLookupProviders(input: {
        schemaId: string;
        schemaVersion?: number;
        layer: string;
    }): Array<{ id: string; metadata: LibraryMetadata; searchable?: boolean }>;
    searchableProviders(language?: string): Array<{
        id: string;
        metadata: LibraryMetadata;
        schemaId: string;
        layers: string[];
    }>;
    searchDictionary(input: {
        providerId: string;
        schemaId: string;
        query: string;
    }): Promise<{
        query: string;
        cached: boolean;
        cachedAt: string;
        results: import("./service/dictionary.js").LibraryDictionaryResult[];
    }>;
    registerFormContribution(contribution: LibraryFormContribution): () => void;
    listFormContributions(): LibraryFormContribution[];
    listSchemas(): LibrarySchema[];
    locations(
        actor: LibraryActor,
        language?: string,
    ): Promise<{
        readable: LibraryLocation[];
        writable: LibraryLocation[];
    }>;
    getSchema(id: string, version?: number): LibrarySchema | null;
    inspectContentPack(root: string): Promise<LibraryContentPackPlan>;
    ingestContentPack(root: string): Promise<LibraryContentPackReceipt>;
    readContentPackAsset(
        publisher: string,
        packId: string,
        version: string,
        assetPath: string,
    ): Promise<LibraryAsset | null>;
    list(
        actor: LibraryActor,
        location: LibraryLocation,
        filters?: LibraryEntryFilters,
    ): Promise<LibraryEntry[]>;
    read(actor: LibraryActor, entryId: string): Promise<LibraryEntry | null>;
    viewedEntryIds(actor: LibraryActor): Promise<string[]>;
    markEntriesViewed(
        actor: LibraryActor,
        entryIds: readonly string[],
    ): Promise<void>;
    readAudio(
        actor: LibraryActor,
        entryId: string,
        fieldId: string,
    ): Promise<{ mediaType: string; data: Buffer }>;
    create(
        actor: LibraryActor,
        location: LibraryLocation,
        input: LibraryEntryInput,
    ): Promise<LibraryEntry>;
    update(
        actor: LibraryActor,
        entryId: string,
        input: LibraryEntryInput,
    ): Promise<LibraryEntry>;
    planDeletion(
        actor: LibraryActor,
        entryIds: readonly string[],
    ): Promise<{
        entryIds: readonly string[];
        entries: readonly { id: string; label: string }[];
    }>;
    deleteEntries(
        actor: LibraryActor,
        entryIds: readonly string[],
        blacklistContentHashes: boolean,
    ): Promise<readonly string[]>;
    resolve(
        actor: LibraryActor,
        location: LibraryLocation,
        input: Pick<
            LibraryEntryInput,
            "schemaId" | "schemaVersion" | "layer" | "label"
        >,
    ): Promise<LibraryResolutionProposal[]>;
    localizeDefinition(
        request: import("./types.js").LibraryDefinitionLocalizationRequest,
    ): Promise<{
        translations: Record<string, string>;
        missingLanguages: string[];
    }>;
    lookup(
        providerId: string,
        input: Pick<
            LibraryEntryInput,
            "schemaId" | "schemaVersion" | "layer" | "label"
        >,
    ): Promise<LibraryLookupSuggestion[]>;
    trace(
        actor: LibraryActor,
        entryId: string,
    ): Promise<{
        entry: LibraryEntry;
        references: LibraryEntry[];
        usedBy: LibraryEntry[];
    }>;
    requestPush(
        actor: LibraryActor,
        entryId: string,
        destination: LibraryLocation,
    ): Promise<LibraryPushRequest>;
    merge(
        actor: LibraryActor,
        entryId: string,
        input: LibraryEntryInput,
    ): Promise<{ entry: LibraryEntry; request?: LibraryPushRequest }>;
    requestUpdate(
        actor: LibraryActor,
        entryId: string,
        proposedEntry: LibraryEntryInput,
    ): Promise<LibraryPushRequest>;
    listPushRequests(
        actor: LibraryActor,
        status?: LibraryPushRequest["status"],
    ): Promise<LibraryPushRequest[]>;
    reviewPush(
        actor: LibraryActor,
        requestId: string,
        decision: "approved" | "rejected",
    ): Promise<LibraryPushRequest>;
    withdrawPush(
        actor: LibraryActor,
        requestId: string,
    ): Promise<LibraryPushRequest>;
    moveToPersonal(
        actor: LibraryActor,
        entryId: string,
    ): Promise<LibraryPushRequest>;
    relocate(
        actor: LibraryActor,
        entryId: string,
        destination: LibraryLocation,
    ): Promise<{ entry: LibraryEntry } | { request: LibraryPushRequest }>;
}
