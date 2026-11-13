import { randomUUID } from "node:crypto";
import type { NamespaceFileClient, StudyAudioCapability } from "@cognis/core";
import type { DbExecutor } from "../../../../../gateways/db/reuse/db-executor.js";

export function createFiles(
    overrides: Partial<NamespaceFileClient> = {},
): NamespaceFileClient {
    const files: NamespaceFileClient = {
        async put() {
            throw new Error("unexpected_file_write");
        },
        async store(actor, data, options) {
            return files.put(actor, randomUUID(), data, options);
        },
        async get() {
            throw new Error("unexpected_file_read");
        },
        async delete() {
            throw new Error("unexpected_file_delete");
        },
        async list() {
            throw new Error("unexpected_file_list");
        },
        ...overrides,
    };
    return files;
}

export function createAudioProvider(
    overrides: Pick<
        StudyAudioCapability,
        "supports" | "cacheKey" | "fetchAudio"
    > &
        Partial<StudyAudioCapability>,
): StudyAudioCapability {
    return {
        registerLanguage() {
            throw new Error("unexpected_language_registration");
        },
        registerProvider() {
            throw new Error("unexpected_provider_registration");
        },
        ...overrides,
    };
}

export function createDatabase(
    overrides: Partial<DbExecutor> = {},
): DbExecutor {
    const database: DbExecutor = {
        async ensureTable() {
            throw new Error("unexpected_schema_creation");
        },
        async executeCommand() {
            throw new Error("unexpected_database_command");
        },
        async transaction(operation) {
            return operation(database);
        },
        ...overrides,
    };
    return database;
}
