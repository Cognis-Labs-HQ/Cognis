import { readJson } from "../../../../../gateways/shared.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { KeyringVaultStore } from "../../store.js";

export interface KeyringRouteContext {
    requireAuth(
        req: IncomingMessage,
        res: ServerResponse,
        minRole?: "user" | "teacher" | "moderator" | "admin" | "owner",
    ): { sub: string; role: string } | null;
}

export type KeyringRouteHandler = (
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
) => Promise<boolean>;

const DEFAULT_MAX_VAULT_BYTES = 2 * 1024 * 1024;

function validVault(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return false;
    const vault = value as Record<string, unknown>;
    return (
        vault.version === 1 &&
        typeof vault.salt === "string" &&
        typeof vault.iv === "string" &&
        typeof vault.cipher === "string" &&
        typeof vault.accountInstanceId === "string" &&
        typeof vault.updatedAt === "string"
    );
}

export function createKeyringRoutes(input: {
    routeContext: KeyringRouteContext;
    store: KeyringVaultStore;
    getAccountInstanceId(accountId: string): Promise<string>;
    purgeDependentAccountData?: (accountId: string) => Promise<void>;
    getPolicy?: () => {
        maxVaultBytes: number;
        derivationIterations: number;
    };
    log?: (
        level: "info" | "warn" | "error",
        message: string,
        metadata?: Record<string, unknown>,
    ) => void;
}): KeyringRouteHandler {
    return async (req, res, url): Promise<boolean> => {
        if (url.pathname !== "/api/v1/auth/keyring") return false;
        const claims = input.routeContext.requireAuth(req, res, "user");
        if (!claims) return true;
        const accountId = claims.sub.trim().toLowerCase();
        const accountInstanceId = await input.getAccountInstanceId(accountId);

        if (req.method === "GET") {
            const stored = await input.store.get(accountId);
            let vault = null;
            try {
                vault = stored ? JSON.parse(stored) : null;
            } catch {
                vault = null;
            }
            if (vault?.accountInstanceId !== accountInstanceId) {
                if (vault) {
                    await input.store.delete(accountId);
                    input.log?.("info", "Purged stale account keyring vault.", {
                        component: "auth-keyring-adapter",
                        operation: "purge_stale_account_instance",
                        accountId,
                    });
                }
                vault = null;
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        vault,
                        accountInstanceId,
                        policy: input.getPolicy?.(),
                    },
                }),
            );
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
            if (body.vault.accountInstanceId !== accountInstanceId) {
                res.writeHead(409, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "keyring_account_instance_mismatch" },
                    }),
                );
                return true;
            }
            const serialized = JSON.stringify(body.vault);
            const maxVaultBytes =
                input.getPolicy?.().maxVaultBytes ?? DEFAULT_MAX_VAULT_BYTES;
            if (Buffer.byteLength(serialized, "utf8") > maxVaultBytes) {
                res.writeHead(413, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({ error: { code: "keyring_too_large" } }),
                );
                return true;
            }
            await input.store.set(accountId, serialized);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { saved: true } }));
            return true;
        }

        if (req.method === "DELETE") {
            await input.purgeDependentAccountData?.(accountId);
            await input.store.delete(accountId);
            res.writeHead(204);
            res.end();
            return true;
        }

        res.writeHead(405, { allow: "GET, PUT, DELETE" });
        res.end();
        return true;
    };
}
