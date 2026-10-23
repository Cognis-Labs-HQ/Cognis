import type { AccessRole } from "@cognis/core";
import { recordStudyResult } from "../../../gateways/study/progress.js";
import { providerDecks } from "./providers.js";
import type { Ctx } from "@cognis/core";
import type {
    StudyAdapter,
    StudyAdapterBootstrapCtx,
} from "../../../gateways/study/gateway.js";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type { RouteContext } from "../../../api/reuse/route-context.js";
import type { DeckLibrary } from "./service/types.js";
import { registerDeckFlows } from "./service/flows.js";
import { DeckStore } from "./service/store.js";
import { DeckService } from "./service/index.js";
import { createDeckRoutes } from "./service/routes.js";
import {
    canReadSharedDeck,
    registerDeckSharing,
    DECK_RESOURCE,
} from "./sharing.js";

let ready = false;

export function createStudyAdapter(): StudyAdapter {
    return {
        adapterId: "flashcards",
        adapterName: "Flashcards",
        getConfig: () => ({}),
        setConfig: () => {},
        isConfigured: () => ready,
    };
}

export async function bootstrapStudyAdapter(
    ctx: StudyAdapterBootstrapCtx,
): Promise<void> {
    const databaseExecutor = ctx.capabilities.get<DbExecutor>("db:executor");
    const system = ctx.capabilities.get<Ctx>("system:ctx");
    const auth = ctx.capabilities.get<RouteContext>("auth:routeContext");
    if (!databaseExecutor || !system || !auth) return;
    const store = new DeckStore(databaseExecutor);
    await store.initialize();
    registerDeckFlows(system);
    const service = new DeckService(
        store,
        () => ctx.capabilities.get<DeckLibrary>("study:library"),
        ctx.flow,
        ctx.log,
        (actor, deck) => canReadSharedDeck(ctx, actor, deck),
        async (accountId) => {
            const list = ctx.capabilities.get<
                (
                    id: string,
                ) => Promise<
                    Array<{ resourceType: string; resourceId: string }>
                >
            >("share:listReceivedTokens");
            return ((await list?.(accountId)) ?? [])
                .filter((record) => record.resourceType === DECK_RESOURCE)
                .map((record) => record.resourceId);
        },
        async (deck) => {
            const remove = ctx.capabilities.get<
                (input: {
                    ownerAccountId: string;
                    resourceType: string;
                    resourceId: string;
                }) => Promise<unknown>
            >("share:deleteResourceShares");
            await remove?.({
                ownerAccountId: deck.ownerAccountId,
                resourceType: DECK_RESOURCE,
                resourceId: deck.id,
            });
        },
        (actor, id) =>
            providerDecks(
                ctx,
                ctx.capabilities.get<DeckLibrary>("study:library"),
                actor,
                id,
            ),
        (result, actor) =>
            recordStudyResult(
                ctx.capabilities,
                { accountId: actor.accountId, role: actor.role as AccessRole },
                result,
            ),
    );
    ctx.capabilities.contribute("study:decks", service);
    ctx.registerRoute(createDeckRoutes(service, auth, ctx.log), "study");
    ctx.registerAdapterStaticDir?.(
        "study",
        "flashcards",
        `${ctx.adapterRoot}/ui`,
    );
    ctx.registerSpaRoute?.({
        id: "adapter.study.flashcards",
        pattern: "^/study(?:/flashcards|/[^/]+/flashcards(?:/[^/]+)?)$",
        base: "/study/flashcards",
        scriptUrl: "/static/adapters/study/flashcards/app/index.js",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/gateways/study/study.css",
            "/static/adapters/study/flashcards/flashcards.css",
        ],
        requiredCapabilities: [
            "study:subPages",
            "study:library:client",
            "study:library:presentation",
        ],
        navigationLabels: {
            en: "Flashcards",
            de: "Lernkarten",
            id: "Kartu Belajar",
            ja: "フラッシュカード",
        },
        isEnabled: () => ctx.isAdapterEnabled(),
    });
    ready = true;
    registerDeckSharing(ctx, service);
    await ctx.log?.("info", "Study flashcards adapter registered.", {
        component: "study-flashcards",
        operation: "bootstrap",
    });
}
