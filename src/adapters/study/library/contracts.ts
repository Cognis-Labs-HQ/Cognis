import type { AccessRole } from "@cognis/core";
import type {
    LibraryAsset,
    LibraryContentPackPlan,
    LibraryContentPackReceipt,
    LibraryEntry,
    LibraryEntryInput,
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
    }): Array<{ id: string; metadata: LibraryMetadata }>;
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
        filters?: { schemaId?: string; layer?: string },
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
    requestUpdate(
        actor: LibraryActor,
        entryId: string,
        proposedEntry: LibraryEntryInput,
    ): Promise<LibraryPushRequest>;
    listPushRequests(actor: LibraryActor): Promise<LibraryPushRequest[]>;
    reviewPush(
        actor: LibraryActor,
        requestId: string,
        decision: "approved" | "rejected",
    ): Promise<LibraryPushRequest>;
    withdrawPush(
        actor: LibraryActor,
        requestId: string,
    ): Promise<LibraryPushRequest>;
    moveToPersonal(actor: LibraryActor, entryId: string): Promise<LibraryEntry>;
}
