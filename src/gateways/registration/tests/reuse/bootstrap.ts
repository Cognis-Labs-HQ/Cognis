import { CapabilityStore } from "@cognis/core";
import type { DbExecutor } from "../../../db/reuse/db-executor.js";
import { createAccountStore } from "./accounts.js";

export function createCapabilities(executor: DbExecutor): CapabilityStore {
    const capabilities = new CapabilityStore();
    capabilities.contribute("db:executor", executor);
    capabilities.contribute("db:type", "memory");
    capabilities.contribute("auth:accountStore", createAccountStore());
    capabilities.contribute("auth:onboarding", {
        issue: async (accountId: string) => `onboarding:${accountId}`,
        listOperations: () => [],
    });
    capabilities.contribute("notify:emailAvailable", () => true);
    capabilities.contribute("notify:isEmailRegistered", async () => false);
    capabilities.contribute(
        "notify:upsertVerifiedPrimaryEmail",
        async () => {},
    );
    return capabilities;
}

export function createEmptyExecutor(): DbExecutor {
    const executor: DbExecutor = {
        executeCommand: async () => ({ rows: [], rowCount: 0 }),
        ensureTable: async () => {},
        transaction: async (callback) => callback(executor),
    };
    return executor;
}
