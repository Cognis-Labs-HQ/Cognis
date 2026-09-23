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
import { LibraryService, type LibraryProviderCapability } from "./service.js";
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
    )?.("study-library", "Study Library");
    const dispatchNotification =
        ctx.capabilities.get<
            (envelope: {
                category: string;
                recipientUsername: string;
                subject: string;
                body: string;
                actionUrl?: string;
            }) => Promise<unknown>
        >("notify:dispatch");
    const accountStore = ctx.capabilities.get<{
        list(): Promise<Array<{ username: string; enabled: boolean }>>;
    }>("auth:accountStore");
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
        dispatchNotification && accountStore
            ? async ({ entryCount, language }) => {
                  try {
                      const accounts = await accountStore.list();
                      await Promise.allSettled(
                          accounts
                              .filter(({ enabled }) => enabled)
                              .map(({ username }) =>
                                  dispatchNotification({
                                      category: "study-library",
                                      recipientUsername: username,
                                      subject: "New Study Library content",
                                      body: `${entryCount} new ${language ? `${language} ` : ""}Library ${entryCount === 1 ? "entry is" : "entries are"} available.`,
                                      actionUrl: "/study/library",
                                  }),
                              ),
                      );
                  } catch (error) {
                      await ctx.log?.(
                          "error",
                          "Could not notify accounts about new Study Library content.",
                          {
                              component: "study-library",
                              operation: "notify-new-content",
                              error:
                                  error instanceof Error
                                      ? error.message
                                      : String(error),
                          },
                      );
                  }
              }
            : undefined,
    );
    ctx.capabilities.contribute("study:library", service);
    const registerConstructor = service.registerFormContribution.bind(service);
    ctx.capabilities.contribute(
        "study:library:registerFormContribution",
        registerConstructor,
    );
    const systemCtx = ctx.capabilities.get<Ctx>("system:ctx");
    if (!systemCtx?.hasCapability("study:library:registerConstructor"))
        systemCtx?.contributePublicCapability(
            "study:library:registerConstructor",
            registerConstructor,
        );
    if (!systemCtx?.hasCapability("study:library:provider"))
        systemCtx?.contributePublicCapability("study:library:provider", {
            inspectContentPack: service.inspectContentPack.bind(service),
            ingestContentPack: service.ingestContentPack.bind(service),
            registerConstructor,
        } satisfies LibraryProviderCapability);
    ctx.registerRoute(
        createLibraryRoutes(
            service,
            ctx.capabilities.get<RouteContext>("auth:routeContext"),
            ctx.log,
        ),
        "study",
    );
    ctx.registerAdapterStaticDir?.("study", "library", UI_ROOT);
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
        requiredCapabilities: ["study:library:detailFlow"],
        isEnabled: () => ctx.isAdapterEnabled(),
    });
    ctx.registerSpaRoute?.({
        id: "study-library-layer-page",
        pattern: "^/study/layers/[^/]+/[^/]+$",
        base: "/study/layers",
        scriptUrl: "/static/adapters/study/library/app/layer/index.js",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/gateways/study/study.css",
            "/static/adapters/study/library/library.css",
            "/static/adapters/study/library/library-selection.css",
        ],
        requiredCapabilities: ["study:library:detailFlow"],
        isEnabled: () => ctx.isAdapterEnabled(),
    });
    adapterReady = true;
    await ctx.log?.("info", "Study/library adapter bootstrapped.", {
        component: "study-library",
        operation: "bootstrap",
    });
}
