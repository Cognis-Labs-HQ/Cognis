import { buildServer } from "./server.js";
import type {
    ModuleManifest,
    ModuleRuntimeGateway,
    ModuleState,
} from "@cognis/core";
import {
    GatewayService,
    GatewayRegistry,
    CapabilityStore,
    type BootstrapLog,
} from "@cognis/core";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { issueAccessToken } from "../gateways/auth/access-tokens.js";
import { createHash } from "node:crypto";
import { RouteRegistry } from "./route-registry.js";
import { UIRegistry } from "./ui-registry.js";
import { setAppLogger, writeConsoleLog } from "./logger.js";
import type { LocalAccountStore } from "./reuse/account-store.js";
import type { UserPreferenceStore } from "./reuse/preference-store.js";
import type { DbExecutor } from "../gateways/db/reuse/db-executor.js";
import type { DbDialectHelper } from "../gateways/db/bootstrap.js";

class InMemoryModuleRuntimeGateway implements ModuleRuntimeGateway {
    private readonly manifests: ModuleManifest[];
    private readonly states = new Map<string, ModuleState>();

    constructor(manifests: ModuleManifest[]) {
        this.manifests = manifests;
        for (const manifest of manifests) {
            const enabled = manifest.class === "core";
            this.states.set(manifest.id, { moduleId: manifest.id, enabled });
        }
    }

    static async bootstrap(): Promise<InMemoryModuleRuntimeGateway> {
        const manifests: ModuleManifest[] = [
            {
                id: "cognis-core",
                name: "Cognis Core",
                version: "1.0.0",
                class: "core",
                coreApiVersion: "v1",
                capabilities: [
                    "system:health",
                    "auth:accounts",
                    "modules:lifecycle",
                    "ui:shell",
                ],
                entrypoints: {},
                publisher: "Cognis Labs",
            },
        ];
        const modulesRoot =
            process.env.COGNIS_MODULES_ROOT ??
            path.resolve(process.cwd(), "src", "modules");

        async function scanManifestDir(dir: string): Promise<void> {
            let dirEntries: Awaited<ReturnType<typeof readdir>>;
            try {
                dirEntries = await readdir(dir, { withFileTypes: true });
            } catch (error) {
                writeConsoleLog(
                    "error",
                    "Failed to scan modules directory during bootstrap.",
                    {
                        component: "api-bootstrap",
                        dir,
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    },
                );
                return;
            }
            for (const dirEntry of dirEntries.filter((e) => e.isDirectory())) {
                const manifestPath = path.join(
                    dir,
                    dirEntry.name,
                    "manifest.json",
                );
                try {
                    const raw = await readFile(manifestPath, "utf8");
                    manifests.push(JSON.parse(raw));
                } catch (error) {
                    if (
                        error instanceof Error &&
                        (error as NodeJS.ErrnoException).code === "ENOENT"
                    ) {
                        continue;
                    }
                    writeConsoleLog(
                        "error",
                        "Failed to load module manifest during bootstrap.",
                        {
                            component: "api-bootstrap",
                            moduleId: dirEntry.name,
                            manifestPath,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        },
                    );
                }
            }
        }

        await Promise.all([
            scanManifestDir(modulesRoot),
            // Study language modules live under study/languages/<code>/ and each
            // carries its own manifest — scan that nested path so they appear in
            // the modules list alongside top-level modules.
            scanManifestDir(path.join(modulesRoot, "study", "languages")),
        ]);

        return new InMemoryModuleRuntimeGateway(manifests);
    }

    async listManifests() {
        return this.manifests;
    }

    async installFromZip(_binary: Uint8Array) {
        throw new Error(
            "ZIP module installation is not wired in bootstrap runtime yet",
        );
    }

    async enable(moduleId: string) {
        const state = { moduleId, enabled: true };
        this.states.set(moduleId, state);
        return state;
    }

    async disable(moduleId: string) {
        const state = { moduleId, enabled: false };
        this.states.set(moduleId, state);
        return state;
    }
}

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.LISTEN_HOST ?? "0.0.0.0";
const adaptersRoot =
    process.env.COGNIS_ADAPTERS_ROOT ??
    path.resolve(process.cwd(), "src", "adapters");

function bootstrapLog(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    meta?: Record<string, unknown>,
) {
    writeConsoleLog(level, message, meta);
}
bootstrapLog("info", "Starting Cognis API bootstrap.", { host, port });

const cliTokenPath =
    process.env.COGNIS_CLI_TOKEN_PATH ?? "/app/config/cli-access.token";
const cliAccessToken = issueAccessToken("cognis-cli", "admin", null);
try {
    await mkdir(path.dirname(cliTokenPath), { recursive: true });
    await writeFile(cliTokenPath, `${cliAccessToken}\n`, { mode: 0o600 });
    bootstrapLog("info", "CLI access token initialized.", {
        path: cliTokenPath,
    });
} catch (error) {
    bootstrapLog(
        "warn",
        "Failed to persist CLI access token; continuing without file bootstrap token.",
        {
            path: cliTokenPath,
            error: error instanceof Error ? error.message : String(error),
        },
    );
}

const runtime = await InMemoryModuleRuntimeGateway.bootstrap();
bootstrapLog("info", "Module runtime bootstrapped.");

const routeRegistry = new RouteRegistry();
const gatewayRegistry = new GatewayRegistry();
const capabilities = new CapabilityStore();
const uiRegistry = new UIRegistry();
const gatewayService = new GatewayService(gatewayRegistry);

const gatewaysRoot =
    process.env.COGNIS_GATEWAYS_ROOT ??
    path.resolve(process.cwd(), "src", "gateways");

const requiredGatewayIds = await gatewayService.bootstrap(gatewaysRoot, {
    adaptersRoot,
    routeRegistry,
    gatewayRegistry,
    capabilities,
    uiRegistry,
});

const contributedLog = capabilities.get<BootstrapLog>("logging:log");
if (contributedLog) {
    setAppLogger(contributedLog);
}
const log = contributedLog ?? bootstrapLog;

function logFatalFailure(
    event: "uncaught_exception" | "unhandled_rejection",
    error: unknown,
): void {
    log("error", "Fatal runtime failure detected.", {
        component: "api-runtime",
        fatal: true,
        event,
        error: error instanceof Error ? error.message : String(error),
    });
}

process.on("uncaughtException", (error) => {
    logFatalFailure("uncaught_exception", error);
});

process.on("unhandledRejection", (reason) => {
    logFatalFailure("unhandled_rejection", reason);
});

await log("info", "Gateway bootstrap complete.", {
    adaptersRoot,
    gatewaysRoot,
    requiredIds: requiredGatewayIds,
});

try {
    gatewayService.assertRequiredInitialized(requiredGatewayIds);
} catch (err) {
    await log(
        "error",
        "A required gateway failed to initialize. Refusing to start.",
        { error: err instanceof Error ? err.message : String(err) },
    );
    process.exit(1);
}

const dbExecutor = capabilities.get<DbExecutor>("db:executor")!;
const dbDialect = capabilities.get<DbDialectHelper>("db:dialect")!;
const adminStateResult = await dbDialect.executeCommand({
    option: "SELECT",
    table: "bootstrap_state",
    columns: ["state_value"],
    where: [{ column: "state_key", value: "default_admin_initialized" }],
    limit: 1,
});
const adminInitialized = adminStateResult.rows?.[0]?.state_value === "true";

const createLocalAdmin = capabilities.get<
    (username: string, password: string) => Promise<void>
>("auth:createLocalAdmin");

if (!adminInitialized && createLocalAdmin) {
    const { randomBytes } = await import("node:crypto");
    const adminPassword = randomBytes(12).toString("base64url");
    await createLocalAdmin("admin", adminPassword);
    await dbDialect.upsert(
        "bootstrap_state",
        "state_key",
        "default_admin_initialized",
        { state_value: "true" },
    );
    await log("warn", "Default admin account created.", {
        username: "admin",
        generatedPassword: adminPassword,
    });
} else if (!adminInitialized) {
    await log(
        "warn",
        "Default admin bootstrap skipped (auth gateway not available).",
    );
} else {
    await log("info", "Default admin bootstrap skipped (already initialized).");
}

const createProfile = capabilities.get<
    (accountId: string, handle: string, role?: string) => Promise<void>
>("profile:createProfile");
if (!adminInitialized && createProfile) {
    await createProfile("admin", "admin", "owner");
}

const accountStore = capabilities.get<LocalAccountStore>("auth:accountStore");
const preferenceStore =
    capabilities.get<UserPreferenceStore>("preferences:store");

const profileStore = capabilities.get<{
    getProfile: (accountId: string) => Promise<{ visibility?: string } | null>;
    updateProfile: (
        accountId: string,
        updates: { visibility?: "friends" },
    ) => Promise<unknown>;
    searchProfiles: (
        query: string,
        limit: number,
        options?: { includeHidden?: boolean },
    ) => Promise<
        Array<{ accountId?: string; handle?: string; displayName?: string }>
    >;
}>("social:profileStore");

const server = buildServer({
    moduleRuntimeGateway: runtime,
    accountStore,
    preferenceStore,
    routeRegistry,
    gatewayRegistry,
    uiRegistry,
    log,
    createProfile,
    setProfileRole: capabilities.get<
        (handle: string, role: string) => Promise<void>
    >("profile:setRoleByHandle"),
    searchProfiles: profileStore
        ? profileStore.searchProfiles.bind(profileStore)
        : undefined,
    getProfileVisibility: profileStore
        ? async (accountId: string) =>
              (await profileStore.getProfile(accountId))?.visibility
        : undefined,
    setProfileVisibility: profileStore
        ? async (accountId: string, visibility: "friends") => {
              await profileStore.updateProfile(accountId, { visibility });
          }
        : undefined,
    onModuleStateChanged: capabilities.get<
        (moduleId: string, enabled: boolean) => Promise<void> | void
    >("modules:onStateChanged"),
    getModuleCapability: <T>(capabilityId: string) =>
        capabilities.get<T>(capabilityId),
    loadModuleStates: async () => {
        const result = await dbExecutor.executeCommand({
            option: "SELECT",
            table: "modules",
            columns: ["module_id", "enabled"],
        });
        return (result.rows ?? []).map((row) => ({
            moduleId: row.module_id,
            enabled: Boolean(row.enabled),
        }));
    },
    persistModuleState: async (moduleId, enabled) => {
        await dbDialect.upsert("modules", "module_id", moduleId, { enabled });
    },
    loadGatewayStates: async () => {
        const result = await dbExecutor.executeCommand({
            option: "SELECT",
            table: "gateways",
            columns: ["gateway_id", "enabled"],
        });
        return (result.rows ?? []).map((row) => ({
            gatewayId: row.gateway_id,
            enabled: Boolean(row.enabled),
        }));
    },
    persistGatewayState: async (gatewayId, enabled) => {
        await dbDialect.upsert("gateways", "gateway_id", gatewayId, {
            enabled,
        });
    },
    moduleIntegrityChecker: async () => {
        const manifests = await runtime.listManifests();
        const report = [] as Array<{
            moduleId: string;
            file: string;
            expected: string;
            actual: string | null;
            status: "ok" | "mismatch" | "missing";
        }>;
        for (const manifest of manifests) {
            for (const file of manifest.files ?? []) {
                const candidate = path.resolve(
                    process.env.COGNIS_MODULES_ROOT ??
                        path.resolve(process.cwd(), "src", "modules"),
                    manifest.id,
                    file.path,
                );
                try {
                    const raw = await readFile(candidate);
                    const actual = createHash("sha256")
                        .update(raw)
                        .digest("hex");
                    report.push({
                        moduleId: manifest.id,
                        file: file.path,
                        expected: file.sha256,
                        actual,
                        status: actual === file.sha256 ? "ok" : "mismatch",
                    });
                } catch {
                    report.push({
                        moduleId: manifest.id,
                        file: file.path,
                        expected: file.sha256,
                        actual: null,
                        status: "missing",
                    });
                }
            }
        }
        return report;
    },
});
server.listen(port, host, () => {
    void log("info", "Cognis API listening.", { host, port });
});
