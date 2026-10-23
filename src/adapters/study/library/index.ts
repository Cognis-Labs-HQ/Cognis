import { createContentNotifiers } from "./content-notifications.js";
import { registerLibraryCapabilities } from "./provider.js";
import { languageAvailability } from "./service/availability.js";
import { createNotificationDelivery } from "./notification-delivery.js";
import { createRequestNotifier } from "./request-notifications.js";
import { LibraryImageStore } from "./image-store.js";
import type { StudyAudioCapability } from "@cognis/core";
import type { UserPreferenceStore } from "../../../api/reuse/preference-store.js";
import { DictionarySearchState } from "./service/search-context.js";
import { createDictionarySearchContextRoutes } from "./routes/search-context.js";
import { CORE_CACHE_CAPABILITY, type ProbeCacheFactory } from "@cognis/core";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
    StudyAdapter,
    StudyAdapterBootstrapCtx,
    StudyClassAccessCapability,
} from "../../../gateways/study/gateway.js";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type {
    Ctx,
    NamespaceDefinition,
    NamespaceFileClientFactory,
} from "@cognis/core";
import type { RouteContext } from "../../../api/reuse/route-context.js";
import { createLibraryRoutes } from "./routes/index.js";
import { LibraryService } from "./service/index.js";
import { LibraryStore } from "./store.js";
import { LibraryAudioCache } from "./audio-cache.js";
import {
    STRING_LOCALIZATION_CAPABILITY,
    type StringLocalizationCapability,
} from "./types.js";

let adapterReady = false;
const UI_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "ui");

export function createStudyAdapter(): StudyAdapter {
    return {
        adapterId: "library",
        adapterName: "Library",
        getConfig: () => ({}),
        setConfig: () => {},
        isConfigured: () => adapterReady,
    };
}

export async function bootstrapStudyAdapter(
    ctx: StudyAdapterBootstrapCtx,
): Promise<void> {
    const databaseExecutor = ctx.capabilities.get<DbExecutor>("db:executor");
    if (!databaseExecutor) {
        await ctx.log?.(
            "error",
            "Study/library adapter requires the DB gateway.",
            { component: "study-library", operation: "bootstrap" },
        );
        return;
    }
    const registerFileNamespace = ctx.capabilities.get<
        (definition: NamespaceDefinition) => void
    >("files:registerNamespace");
    const createNamespaceClient =
        ctx.capabilities.get<NamespaceFileClientFactory>("files:namespace");
    if (!registerFileNamespace || !createNamespaceClient) {
        await ctx.log?.(
            "error",
            "Study/library adapter requires the Files gateway.",
            { component: "study-library", operation: "bootstrap" },
        );
        return;
    }
    registerFileNamespace({
        id: "study-library-audio",
        ownerComponent: "study-library",
        acl: { visibility: "component-managed" },
    });
    const audioCache = new LibraryAudioCache(
        createNamespaceClient({
            namespaceId: "study-library-audio",
            callerComponent: "study-library",
        }),
        ctx.log,
    );
    registerFileNamespace({
        id: "study-library-images",
        ownerComponent: "study-library",
        acl: { visibility: "component-managed" },
    });
    const imageStore = new LibraryImageStore(
        createNamespaceClient({
            namespaceId: "study-library-images",
            callerComponent: "study-library",
        }),
    );
    const store = new LibraryStore(databaseExecutor);
    try {
        await store.ensureSchema();
    } catch (error) {
        await ctx.log?.(
            "error",
            "Study/library schema initialization failed.",
            {
                component: "study-library",
                operation: "bootstrap",
                fatal: true,
                error: error instanceof Error ? error.message : String(error),
            },
        );
        return;
    }
    ctx.capabilities.get<(id: string, label: string) => void>(
        "notify:registerCategory",
    )?.("study", "Study");
    const { dispatch: dispatchNotification, accounts: accountStore } =
        createNotificationDelivery(ctx);
    const contentNotifiers = createContentNotifiers({
        accounts: accountStore,
        dispatch: dispatchNotification,
        flow: ctx.flow,
        log: ctx.log,
    });
    const service = new LibraryService(
        store,
        ctx.capabilities.get<StudyClassAccessCapability>(
            "study:classes:access",
        ),
        ctx.flow,
        ctx.log,
        ctx.capabilities.get<StringLocalizationCapability>(
            STRING_LOCALIZATION_CAPABILITY,
        ),
        audioCache,
        contentNotifiers.newContent,
        ctx.capabilities.require<ProbeCacheFactory>(CORE_CACHE_CAPABILITY),
        contentNotifiers.deletedContent,
        ctx.capabilities.get<StudyAudioCapability>("study:audio"),
        imageStore,
        createRequestNotifier({
            flow: ctx.flow,
            accounts: accountStore,
            dispatch: dispatchNotification,
            log: ctx.log,
        }),
        languageAvailability((id) => ctx.capabilities.get(id)),
    );
    registerLibraryCapabilities(ctx, service);
    const systemCtx = ctx.capabilities.get<Ctx>("system:ctx");
    const preferences =
        ctx.capabilities.get<UserPreferenceStore>("preferences:store");
    const auth = ctx.capabilities.get<RouteContext>("auth:routeContext");
    if (preferences && auth) {
        if (!systemCtx?.hasFlow("study:library:readSearchContext"))
            systemCtx?.registerFlow({
                id: "study:library:readSearchContext",
                stages: ["authorize", "resolve"],
            });
        if (!systemCtx?.hasFlow("study:library:searchContext"))
            systemCtx?.registerFlow({
                id: "study:library:searchContext",
                stages: ["authorize", "validate", "persist"],
            });
        ctx.registerRoute(
            createDictionarySearchContextRoutes(
                new DictionarySearchState(preferences),
                auth,
                ctx.flow,
                ctx.log,
            ),
            "study",
        );
    }
    ctx.registerRoute(
        createLibraryRoutes(
            service,
            ctx.capabilities.get<RouteContext>("auth:routeContext"),
            ctx.log,
        ),
        "study",
    );
    ctx.registerAdapterStaticDir?.("study", "library", UI_ROOT);
    ctx.registerCapabilityProvider({
        scriptUrl: "/static/adapters/study/library/provider.js",
        providesCapabilities: [
            "study:library:client",
            "study:library:presentation",
        ],
        isEnabled: () => ctx.isAdapterEnabled(),
    });
    ctx.registerSpaRoute?.({
        id: "study-library-page",
        pattern: "^/study/library$",
        base: "/study/library",
        scriptUrl: "/static/adapters/study/library/app/index.js",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/gateways/study/study.css",
            "/static/adapters/study/library/library.css",
            "/static/adapters/study/library/library-selection.css",
        ],
        requiredCapabilities: [
            "study:library:detailFlow",
            "study:library:client",
        ],
        isEnabled: () => ctx.isAdapterEnabled(),
    });
    ctx.registerSpaRoute?.({
        id: "study-library-layer-page",
        pattern: "^/study/explore(?:/[^/]+/[^/]+(?:/[^/]+)?)?$",
        base: "/study/explore",
        scriptUrl: "/static/adapters/study/library/app/layer/index.js",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/gateways/study/study.css",
            "/static/adapters/study/library/library.css",
            "/static/adapters/study/library/library-selection.css",
        ],
        requiredCapabilities: [
            "study:library:detailFlow",
            "study:library:client",
        ],
        isEnabled: () => ctx.isAdapterEnabled(),
    });
    ctx.registerSpaRoute?.({
        id: "study-library-requests-page",
        pattern: "^/study/library/requests$",
        base: "/study/library/requests",
        scriptUrl: "/static/adapters/study/library/app/requests/index.js",
        navigationLabels: {
            de: "Anfragen",
            en: "Requests",
            id: "Permintaan",
            ja: "リクエスト",
        },
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/gateways/study/study.css",
            "/static/adapters/study/library/library.css",
        ],
        requiredCapabilities: [
            "study:library:detailFlow",
            "study:library:client",
        ],
        isEnabled: () => ctx.isAdapterEnabled(),
    });
    adapterReady = true;
    ctx.registerSpaRoute?.({
        id: "study-library-search-page",
        pattern: "^/study/library/search$",
        base: "/study/library/search",
        scriptUrl: "/static/adapters/study/library/app/search/index.js",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/gateways/study/study.css",
            "/static/adapters/study/library/library.css",
        ],
        requiredCapabilities: [
            "study:library:detailFlow",
            "study:library:client",
        ],
        isEnabled: () => ctx.isAdapterEnabled(),
    });
    await ctx.log?.("info", "Study/library adapter bootstrapped.", {
        component: "study-library",
        operation: "bootstrap",
    });
}
