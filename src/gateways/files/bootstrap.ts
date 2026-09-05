import { readGatewayManifestVersion } from "../reuse/manifest-version.js";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
    FileStorageGateway,
    NamespaceDefinition,
    NamespaceFileClientFactory,
} from "@cognis/core";
import type { GatewayBootstrapContext } from "../shared.js";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import type { RouteContext } from "../../api/reuse/route-context.js";
import { resolveRouteContext } from "../../api/reuse/route-context.js";
import { NamespaceRegistry } from "./reuse/namespace-registry.js";
import { DbFileObjectStore } from "./reuse/file-object-store.js";
import { NamespaceFileService } from "./reuse/namespace-file-service.js";
import type { FileQuotaStore } from "./reuse/quota-store-contract.js";
import { createFileRoutes, createQuotaAdminRoutes } from "./routes/index.js";
import { createFileLibraryRoutes } from "./routes/library.js";
import { FileLibraryService } from "./reuse/library-service.js";
import {
    createLockedAdapterAdminRoutes,
    loadAdapterAdminCatalog,
} from "../reuse/adapter-admin-catalog.js";

async function loadLocalFileGateway(
    fileStorePath: string,
    adaptersRoot: string,
): Promise<FileStorageGateway> {
    const localAdapterPath = path.resolve(
        adaptersRoot,
        "file",
        "local",
        "index.ts",
    );
    const localAdapterModule = await import(
        `${localAdapterPath}?t=${Date.now()}`
    );
    const LocalAdapterGatewayClass = localAdapterModule.LocalFileGateway as
        (new (rootPath: string) => FileStorageGateway) | undefined;
    if (!LocalAdapterGatewayClass) {
        throw new Error("local_file_adapter_missing_gateway_class");
    }
    return new LocalAdapterGatewayClass(fileStorePath);
}

async function loadQuotaStore(
    getDb: () => DbExecutor | undefined,
    adaptersRoot: string,
): Promise<FileQuotaStore> {
    const quotaAdapterPath = path.resolve(
        adaptersRoot,
        "file",
        "quota",
        "index.ts",
    );
    const quotaAdapterModule = await import(
        `${quotaAdapterPath}?t=${Date.now()}`
    );
    const DbFileQuotaStoreClass = quotaAdapterModule.DbFileQuotaStore as
        | (new (getDb: () => DbExecutor | undefined) => FileQuotaStore)
        | undefined;
    if (!DbFileQuotaStoreClass) {
        throw new Error("file_quota_adapter_missing_store_class");
    }
    return new DbFileQuotaStoreClass(getDb);
}

/**
 * Standard gateway bootstrap entry point for the files gateway. Wires the
 * local storage adapter, the namespace registry, ACL enforcement, and the
 * quota adapter together into a NamespaceFileService, then contributes:
 *
 *   files:registerNamespace — (definition) => void
 *       Claims a namespace id. Called once by each owning component's
 *       bootstrap. Throws on duplicate registration.
 *   files:namespace — ({ namespaceId, callerComponent }) => NamespaceFileClient
 *       Binds a component to one namespace so call sites pass only actor/key
 *       details while the files gateway keeps enforcing namespace ACLs.
 *   files:put / files:store / files:get / files:delete / files:list
 *       Namespace-scoped file operations for in-process/component use.
 *       Every call is ACL- and quota-checked before reaching storage.
 *   files:quota:provisionUser — (username) => Promise<void>
 *       Snapshots current namespace/global default quotas into per-user
 *       rows. Called by auth/registration flows when a new account is
 *       created so quotas are locked in at creation time.
 *
 * The files gateway bootstraps before the DB gateway (see
 * GatewayService.bootstrap ordering notes), so the DB executor is resolved
 * lazily on first use rather than at bootstrap time. File creation without a
 * namespace is not supported — the legacy bare file:write/file:read/
 * file:append capabilities remain for non-user-content structured logging
 * only (see the logging gateway).
 */
export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const manifestVersion = await readGatewayManifestVersion(
        import.meta.url,
        "./manifest.json",
    );
    const mediaLocation = process.env.MEDIA_LOCATION ?? "/app/media";
    const fileStorePath = `${mediaLocation}/uploads`;
    const adaptersRoot =
        ctx.adaptersRoot ?? path.resolve(process.cwd(), "src", "adapters");
    const rawGateway = await loadLocalFileGateway(fileStorePath, adaptersRoot);
    const getDb = () => ctx.capabilities.get<DbExecutor>("db:executor");
    const quotaStore = await loadQuotaStore(getDb, adaptersRoot);
    const objectStore = new DbFileObjectStore(getDb);
    const registry = new NamespaceRegistry();
    const service = new NamespaceFileService(
        registry,
        rawGateway,
        objectStore,
        () => quotaStore,
    );
    const library = new FileLibraryService(service, async (actorId) => {
        const listOwned = ctx.capabilities.get<
            (
                accountId: string,
            ) => Promise<Array<{ id: string; languageCode?: string }>>
        >("study:classes:listOwned");
        return listOwned ? listOwned(actorId) : [];
    });

    registry.register({
        id: "default",
        ownerComponent: "core",
        acl: { visibility: "component-managed" },
    });
    registry.register({
        id: "user",
        ownerComponent: "core",
        acl: { visibility: "private-owner" },
    });

    ctx.capabilities.contribute(
        "files:registerNamespace",
        (definition: NamespaceDefinition) => {
            service.registerNamespace(definition);
        },
    );
    ctx.capabilities.contribute("files:namespace", ((request) =>
        service.createNamespaceClient(
            request.namespaceId,
            request.callerComponent,
        )) satisfies NamespaceFileClientFactory);
    ctx.capabilities.contribute("files:put", service.put.bind(service));
    ctx.capabilities.contribute("files:store", service.store.bind(service));
    ctx.capabilities.contribute("files:get", service.get.bind(service));
    ctx.capabilities.contribute("files:delete", service.delete.bind(service));
    ctx.capabilities.contribute("files:list", service.list.bind(service));
    ctx.capabilities.contribute(
        "files:library:list",
        library.list.bind(library),
    );
    ctx.capabilities.contribute(
        "files:folders:list",
        library.listFolders.bind(library),
    );
    ctx.capabilities.contribute(
        "files:folders:create",
        library.createFolder.bind(library),
    );
    ctx.capabilities.contribute(
        "files:favorite",
        (actorId: string, namespaceId: string, key: string, favorite = true) =>
            library.updateEntry(actorId, namespaceId, key, { favorite }),
    );
    ctx.capabilities.contribute(
        "files:provider:getDefault",
        library.getDefaultProvider.bind(library),
    );
    ctx.capabilities.contribute(
        "files:provider:setDefault",
        library.setDefaultProvider.bind(library),
    );
    ctx.capabilities.contribute("files:owner", service.getOwner.bind(service));
    let shareHooksRegistered = false;
    ctx.flow.extend(
        "bootstrap-platform",
        "register-flows",
        { id: "files-gateway:share-hooks" },
        () => {
            if (shareHooksRegistered || !ctx.flow.exists("mint-share-token")) {
                return { registered: shareHooksRegistered };
            }
            shareHooksRegistered = true;
            ctx.flow.extend(
                "mint-share-token",
                "validate-resource",
                { id: "files-gateway:validate-share-resource" },
                async (stageCtx) => {
                    const request = stageCtx.input as {
                        resourceType?: string;
                        resourceId?: string;
                        ownerAccountId?: string;
                    };
                    if (request.resourceType !== "file") return null;
                    const separator = String(request.resourceId ?? "").indexOf(
                        "/",
                    );
                    const namespaceId = String(request.resourceId ?? "").slice(
                        0,
                        separator,
                    );
                    const key = String(request.resourceId ?? "").slice(
                        separator + 1,
                    );
                    const ownerAccountId = await service.getOwner(
                        namespaceId,
                        key,
                    );
                    return ownerAccountId &&
                        ownerAccountId === request.ownerAccountId
                        ? {
                              valid: true,
                              resourceType: "file",
                              resourceId: request.resourceId,
                              ownerAccountId,
                              metadata: {
                                  namespaceId,
                                  key,
                                  resourceName: path.basename(key),
                                  resourceTypeLabel: "file",
                              },
                          }
                        : { valid: false, reason: "resource_not_found" };
                },
            );
            ctx.flow.extend(
                "mint-share-token",
                "authorize-minter",
                { id: "files-gateway:authorize-share-minter" },
                (stageCtx) => {
                    const match = (
                        stageCtx.stageResults["validate-resource"] ?? []
                    ).find(
                        (result) =>
                            (
                                result as {
                                    valid?: boolean;
                                    resourceType?: string;
                                }
                            ).valid &&
                            (result as { resourceType?: string })
                                .resourceType === "file",
                    ) as { ownerAccountId?: string } | undefined;
                    return match
                        ? {
                              authorized: true,
                              ownerAccountId: match.ownerAccountId,
                          }
                        : null;
                },
            );
            return { registered: true };
        },
    );
    ctx.capabilities.contribute(
        "files:quota:provisionUser",
        async (username: string) => {
            for (const namespace of registry.list()) {
                await quotaStore.ensureNamespaceDefault(namespace.id);
            }
            await quotaStore.provisionUser(username);
        },
    );

    // Retained for structured logging only (not user-uploaded content) — the
    // logging gateway consumes these directly rather than going through the
    // namespaced files:* surface.
    ctx.capabilities.contribute(
        "file:write",
        async (
            filePath: string,
            content: string | Uint8Array,
        ): Promise<void> => {
            await mkdir(path.dirname(filePath), { recursive: true });
            await writeFile(filePath, content);
        },
    );

    ctx.capabilities.contribute(
        "file:read",
        async (filePath: string): Promise<Buffer | null> => {
            try {
                return await readFile(filePath);
            } catch {
                return null;
            }
        },
    );

    ctx.capabilities.contribute(
        "file:append",
        async (filePath: string, content: string): Promise<void> => {
            await mkdir(path.dirname(filePath), { recursive: true });
            await appendFile(filePath, content, "utf8");
        },
    );

    const routeContext = resolveRouteContext(
        ctx.capabilities.get<RouteContext>("auth:routeContext"),
    );
    ctx.routeRegistry.register(
        createQuotaAdminRoutes(registry, () => quotaStore, routeContext),
        "files",
    );
    ctx.routeRegistry.register(
        createFileLibraryRoutes(library, registry, routeContext),
        "files",
    );
    ctx.routeRegistry.register(
        createFileRoutes(service, routeContext),
        "files",
    );
    const adapterCatalog = await loadAdapterAdminCatalog(adaptersRoot, "file");
    ctx.routeRegistry.register(
        createLockedAdapterAdminRoutes("files", adapterCatalog, routeContext),
        "files",
    );

    ctx.routeRegistry.registerPrefix("/api/v1/files", "files");
    const uiDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "ui");
    ctx.uiRegistry?.registerStaticDir("files", uiDir);
    ctx.uiRegistry?.registerNavbarPlugin({
        scriptUrl: "/static/gateways/files/navbar.js",
        ownerId: "files",
    });
    ctx.uiRegistry?.registerSpaRoute({
        id: "files-page",
        ownerId: "files",
        pattern: "^/files$",
        base: "/files",
        scriptUrl: "/static/gateways/files/app/index.js",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/gateways/files/app/index.css",
        ],
        access: { minRole: "guest" },
    });
    ctx.uiRegistry?.registerAdminSection({
        id: "files",
        label: "Files",
        scriptUrl: "/static/gateways/files/admin-section.js",
        ownerId: "files",
    });
    ctx.uiRegistry?.registerCapabilityProvider({
        scriptUrl: "/static/gateways/files/provider.js",
        providesCapabilities: ["files:uiClient"],
    });
    ctx.gatewayRegistry.register({
        id: "files",
        name: "File Storage Gateway",
        version: manifestVersion,
        required: true,
        description:
            "Provides namespaced, ACL- and quota-enforced file storage for uploads, plus local file logging helpers.",
        publisher: "Cognis Labs HQ",
        hasAdapters: true,
    });
}
