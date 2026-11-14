import path from "node:path";
import type { GatewayBootstrapContext } from "../../shared.js";
import type { DbExecutor } from "../../db/reuse/db-executor.js";
import type { AccessRole } from "../access-tokens.js";
import type { AuthAccountStore } from "./index.js";

export async function loadLocalAccountStore(
    dbExecutor: DbExecutor,
    log?: GatewayBootstrapContext["log"],
): Promise<AuthAccountStore> {
    const localStorePath = path.resolve(
        process.cwd(),
        "src",
        "adapters",
        "auth",
        "local",
        "store.ts",
    );
    const localStoreModule = await import(`${localStorePath}?t=${Date.now()}`);
    const LocalAccountStoreClass = localStoreModule.DbLocalAccountStore as
        | (new (
              dbExecutor: DbExecutor,
              log?: GatewayBootstrapContext["log"],
          ) => AuthAccountStore)
        | undefined;
    if (!LocalAccountStoreClass) {
        throw new Error("local_account_store_missing");
    }
    return new LocalAccountStoreClass(dbExecutor, log);
}

export function resolveRole(sessionRole: string | undefined): AccessRole {
    if (
        sessionRole === "owner" ||
        sessionRole === "admin" ||
        sessionRole === "teacher" ||
        sessionRole === "moderator" ||
        sessionRole === "user"
    ) {
        return sessionRole;
    }
    return "user";
}
