import { buildServer } from "./server.js";
import type {
    ModuleManifest,
    ModuleRuntimeGateway,
    ModuleState,
} from "@cognis/core";
import { initializeDatabaseSchema } from "./bootstrap/db-init.js";
import { LocalAuthGateway } from "./adapters/local-auth-gateway.js";
import {
    DbLocalAccountStore,
    createDbExecutor,
    type SupportedDbType,
} from "./adapters/db/account-store.js";
import { DbUserPreferenceStore } from "./adapters/db/preference-store.js";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { issueAccessToken } from "./auth/access-tokens.js";
import { createHash } from "node:crypto";
import { RouteRegistry } from "./route-registry.js";
import { GatewayRegistry } from "./gateway-registry.js";
import { CapabilityStore } from "./gateway-bootstrap.js";
import { UIRegistry } from "./ui-registry.js";
import { bootstrapGateways } from "./gateways/index.js";
import type { BootstrapLog } from "./gateway-bootstrap.js";

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
        try {
            const entries = await readdir(modulesRoot);
            for (const entry of entries) {
                const manifestPath = path.join(
                    modulesRoot,
                    entry,
                    "manifest.json",
                );
                try {
                    const raw = await readFile(manifestPath, "utf8");
                    manifests.push(JSON.parse(raw));
                } catch {}
            }
        } catch {}
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
const dbType = (process.env.DB_TYPE as SupportedDbType | undefined) ?? "sqlite";

function bootstrapLog(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    meta?: Record<string, unknown>,
) {
    process.stdout.write(
        `${JSON.stringify({ ts: new Date().toISOString(), level, message, ...meta })}\n`,
    );
}
bootstrapLog("info", "Starting Cognis API bootstrap.", {
    host,
    port,
    dbType,
});
const dbExecutor = await createDbExecutor(dbType);
bootstrapLog("info", "Database executor initialized.", { dbType });

await initializeDatabaseSchema(
    dbType,
    { info: (msg, meta) => bootstrapLog("info", msg, meta) },
    dbExecutor,
);
bootstrapLog("info", "Database schema initialised.");

const accountStore = new DbLocalAccountStore(dbExecutor, dbType);
await accountStore.ensureSchema();
bootstrapLog("info", "Account schema ensured.");
const authGateway = new LocalAuthGateway(accountStore);
const preferenceStore = new DbUserPreferenceStore(dbExecutor, dbType);
await preferenceStore.ensureSchema();
bootstrapLog("info", "Preference schema ensured.");
if (dbType === "postgresql") {
    await dbExecutor.execute(
        "INSERT INTO modules (module_id, enabled) VALUES ($1, $2) ON CONFLICT (module_id) DO NOTHING",
        ["cognis-core", true],
    );
} else if (dbType === "sqlite") {
    await dbExecutor.execute(
        "INSERT OR IGNORE INTO modules (module_id, enabled) VALUES (?, ?)",
        ["cognis-core", true],
    );
} else {
    await dbExecutor.execute(
        "INSERT IGNORE INTO modules (module_id, enabled) VALUES (?, ?)",
        ["cognis-core", true],
    );
}
bootstrapLog("info", "Core module baseline state ensured.");

const adminState = await dbExecutor.execute(
    dbType === "postgresql"
        ? "SELECT state_value FROM bootstrap_state WHERE state_key = $1"
        : "SELECT state_value FROM bootstrap_state WHERE state_key = ?",
    ["default_admin_initialized"],
);
const adminInitialized = adminState.rows?.[0]?.state_value === "true";

if (!adminInitialized) {
    const adminPassword = LocalAuthGateway.generatePassword();
    await authGateway.createLocalAdmin("admin", adminPassword);
    if (dbType === "postgresql") {
        await dbExecutor.execute(
            "INSERT INTO bootstrap_state (state_key, state_value) VALUES ($1, $2) ON CONFLICT (state_key) DO UPDATE SET state_value = EXCLUDED.state_value",
            ["default_admin_initialized", "true"],
        );
    } else if (dbType === "sqlite") {
        await dbExecutor.execute(
            "INSERT INTO bootstrap_state (state_key, state_value) VALUES (?, ?) ON CONFLICT(state_key) DO UPDATE SET state_value = excluded.state_value",
            ["default_admin_initialized", "true"],
        );
    } else {
        await dbExecutor.execute(
            "INSERT INTO bootstrap_state (state_key, state_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE state_value = VALUES(state_value)",
            ["default_admin_initialized", "true"],
        );
    }
    bootstrapLog("warn", "Default admin account created.", {
        username: "admin",
        generatedPassword: adminPassword,
    });
} else {
    bootstrapLog(
        "info",
        "Default admin bootstrap skipped (already initialized).",
    );
}

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

const adaptersRoot =
    process.env.COGNIS_ADAPTERS_ROOT ??
    path.resolve(process.cwd(), "src", "adapters");

const gatewaysRoot =
    process.env.COGNIS_GATEWAYS_ROOT ??
    path.resolve(process.cwd(), "src", "api", "gateways");

const requiredGatewayIds = await bootstrapGateways(
    {
        dbExecutor,
        dbType,
        adaptersRoot,
        routeRegistry,
        gatewayRegistry,
        capabilities,
        uiRegistry,
    },
    gatewaysRoot,
);

const log = capabilities.get<BootstrapLog>("logging:log") ?? bootstrapLog;

await log("info", "Gateway bootstrap complete.", {
    adaptersRoot,
    gatewaysRoot,
    requiredIds: requiredGatewayIds,
});

// Verify all required gateways initialized before the server starts.
try {
    gatewayRegistry.assertRequiredInitialized(requiredGatewayIds);
} catch (err) {
    await log(
        "error",
        "A required gateway failed to initialize. Refusing to start.",
        { error: err instanceof Error ? err.message : String(err) },
    );
    process.exit(1);
}

// If the profile gateway is present, contribute the admin profile after the
// gateway itself has initialized (so schema is ready).
const createProfile = capabilities.get<
    (accountId: string, handle: string, role?: string) => Promise<void>
>("profile:createProfile");
if (!adminInitialized && createProfile) {
    await createProfile("admin", "admin", "admin");
}

const server = buildServer({
    moduleRuntimeGateway: runtime,
    authGateway,
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
    loadModuleStates: async () => {
        const result = await dbExecutor.execute(
            "SELECT module_id, enabled FROM modules",
        );
        return (result.rows ?? []).map((row) => ({
            moduleId: row.module_id,
            enabled: Boolean(row.enabled),
        }));
    },
    persistModuleState: async (moduleId, enabled) => {
        if (dbType === "postgresql") {
            await dbExecutor.execute(
                "INSERT INTO modules (module_id, enabled) VALUES ($1, $2) ON CONFLICT (module_id) DO UPDATE SET enabled = EXCLUDED.enabled",
                [moduleId, enabled],
            );
            return;
        }
        if (dbType === "sqlite") {
            await dbExecutor.execute(
                "INSERT INTO modules (module_id, enabled) VALUES (?, ?) ON CONFLICT(module_id) DO UPDATE SET enabled = excluded.enabled",
                [moduleId, enabled],
            );
            return;
        }
        await dbExecutor.execute(
            "INSERT INTO modules (module_id, enabled) VALUES (?, ?) ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)",
            [moduleId, enabled],
        );
    },
    loadGatewayStates: async () => {
        const result = await dbExecutor.execute(
            "SELECT gateway_id, enabled FROM gateways",
        );
        return (result.rows ?? []).map((row) => ({
            gatewayId: row.gateway_id,
            enabled: Boolean(row.enabled),
        }));
    },
    persistGatewayState: async (gatewayId, enabled) => {
        if (dbType === "postgresql") {
            await dbExecutor.execute(
                "INSERT INTO gateways (gateway_id, enabled) VALUES ($1, $2) ON CONFLICT (gateway_id) DO UPDATE SET enabled = EXCLUDED.enabled",
                [gatewayId, enabled],
            );
            return;
        }
        if (dbType === "sqlite") {
            await dbExecutor.execute(
                "INSERT INTO gateways (gateway_id, enabled) VALUES (?, ?) ON CONFLICT(gateway_id) DO UPDATE SET enabled = excluded.enabled",
                [gatewayId, enabled],
            );
            return;
        }
        await dbExecutor.execute(
            "INSERT INTO gateways (gateway_id, enabled) VALUES (?, ?) ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)",
            [gatewayId, enabled],
        );
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
    void log("info", "Cognis API listening.", { host, port, dbType });
});
