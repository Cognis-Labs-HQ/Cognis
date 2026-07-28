import {
    readJson,
    requireAuth,
    type CapabilityStore,
} from "../../../shared.js";
import type { KeyringVaultStore } from "../../keyring-store.js";
import type { UserPreferenceStore } from "../../../../api/reuse/preference-store.js";
import type { AuthGatewayRouteHandler } from "./shared.js";

const MAX_VAULT_BYTES = 2 * 1024 * 1024;
const LEGACY_KEYRING_PREFERENCE_ID = "secure-keyring-v1";

function validVault(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return false;
    const vault = value as Record<string, unknown>;
    return (
        vault.version === 1 &&
        typeof vault.salt === "string" &&
        typeof vault.iv === "string" &&
        typeof vault.cipher === "string" &&
        typeof vault.updatedAt === "string"
    );
}

export function createKeyringRoutes(
    capabilities: CapabilityStore,
): AuthGatewayRouteHandler {
    return async (req, res, url): Promise<boolean> => {
        if (url.pathname !== "/api/v1/auth/keyring") return false;
        const claims = requireAuth(req, res, "user");
        if (!claims) return true;
        const store = capabilities.get<KeyringVaultStore>(
            "auth:keyringVaultStore",
        );
        if (!store) {
            res.writeHead(503, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: { code: "keyring_unavailable" } }));
            return true;
        }

        if (req.method === "GET") {
            let stored = await store.get(claims.sub);
            if (!stored) {
                const preferences =
                    capabilities.get<UserPreferenceStore>("preferences:store");
                const legacy = await preferences?.get(
                    claims.sub,
                    LEGACY_KEYRING_PREFERENCE_ID,
                );
                if (legacy && legacy !== "null") {
                    stored = legacy;
                    await store.set(claims.sub, legacy);
                    await preferences?.set(
                        claims.sub,
                        LEGACY_KEYRING_PREFERENCE_ID,
                        "null",
                    );
                }
            }
            let vault = null;
            try {
                vault = stored ? JSON.parse(stored) : null;
            } catch {
                vault = null;
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { vault } }));
            return true;
        }

        if (req.method === "PUT") {
            const body = await readJson(req);
            if (!validVault(body.vault)) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "invalid_keyring_vault" },
                    }),
                );
                return true;
            }
            const serialized = JSON.stringify(body.vault);
            if (Buffer.byteLength(serialized, "utf8") > MAX_VAULT_BYTES) {
                res.writeHead(413, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({ error: { code: "keyring_too_large" } }),
                );
                return true;
            }
            await store.set(claims.sub, serialized);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { saved: true } }));
            return true;
        }

        if (req.method === "DELETE") {
            await store.delete(claims.sub);
            res.writeHead(204);
            res.end();
            return true;
        }

        res.writeHead(405, { allow: "GET, PUT, DELETE" });
        res.end();
        return true;
    };
}
