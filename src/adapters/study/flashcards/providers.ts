import type { Ctx } from "@cognis/core";
import { createHash } from "node:crypto";
import type { StudyAdapterBootstrapCtx } from "../../../gateways/study/gateway.js";
import type {
    DeckActor,
    DeckDetail,
    DeckLibrary,
    StudyDeck,
} from "./service/types.js";

export interface StarterDeck {
    key: string;
    name: Record<string, string>;
    schemaId: string;
    sourceRecordIds: string[];
}

interface ProviderLanguage {
    moduleId: string;
    languageCode: string;
    package?: { id: string; contentRevision: string };
    starterDecks?: StarterDeck[];
}
/** Stable provider identities survive content revisions without copying Library records. */

export function starterDeckId(packId: string, key: string): string {
    const hash = createHash("sha256").update(`${packId}\0${key}`).digest("hex");
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-8${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export async function providerDecks(
    ctx: StudyAdapterBootstrapCtx,
    library: DeckLibrary | undefined,
    actor: DeckActor,
    requestedId?: string,
): Promise<StudyDeck[]> {
    if (!library?.list) return [];
    const result: StudyDeck[] = [];
    const system = ctx.capabilities.get<Ctx>("system:ctx");
    for (const capability of (
        system?.listCapabilities() ?? ctx.capabilities.list()
    ).filter((id) => /^study:language:[^:]+$/.test(id))) {
        const provider = (system?.getCapability(capability) ??
            ctx.capabilities.get(capability)) as ProviderLanguage | undefined;
        if (
            !provider?.package ||
            !provider.starterDecks ||
            !(await ctx.gateway.isLanguageModuleEnabled(provider.moduleId))
        )
            continue;
        for (const definition of provider.starterDecks) {
            const id = starterDeckId(provider.package.id, definition.key);
            if (requestedId && id !== requestedId) continue;
            if (
                !definition.key ||
                !definition.schemaId ||
                !definition.name?.en ||
                !Array.isArray(definition.sourceRecordIds) ||
                !definition.sourceRecordIds.length ||
                definition.sourceRecordIds.length > 500 ||
                definition.sourceRecordIds.some((id) => typeof id !== "string")
            )
                throw new Error("invalid_starter_deck");
            const entries = await library.list(
                actor,
                { scope: "global", scopeId: "" },
                {
                    schemaId: definition.schemaId,
                    sourceRecordIds: definition.sourceRecordIds,
                },
            );
            const byKey = new Map(
                entries.map((entry) => [entry.sourceRecordId, entry]),
            );
            const ordered = definition.sourceRecordIds.map((id) =>
                byKey.get(id),
            );
            if (ordered.some((entry) => !entry)) continue;
            const cards = requestedId
                ? await Promise.all(
                      ordered.map((entry) => library.trace(actor, entry!.id)),
                  )
                : [];
            result.push({
                id,
                name: definition.name.en,
                names: definition.name,
                language: provider.languageCode,
                provider: true,
                ownerAccountId: `provider:${provider.package.id}`,
                entryIds: ordered.map((entry) => entry!.id),
                notes: [],
                schemas: library.listSchemas?.() ?? [],
                cards: cards.map(({ entry, references }): DeckDetail => ({
                    entry,
                    references,
                })),
                progress: {},
                canEdit: false,
            });
        }
    }
    return result;
}
