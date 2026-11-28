import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDatabaseExecutor } from "../executor.js";

test("createDatabaseExecutor loads the matching adapter factory on the fly", async () => {
    const temporaryRoot = await mkdtemp(
        path.join(os.tmpdir(), "cognis-db-adapter-"),
    );
    try {
        const adapterDirectory = path.join(temporaryRoot, "db", "custom");
        await mkdir(adapterDirectory, { recursive: true });
        await writeFile(
            path.join(adapterDirectory, "index.ts"),
            `export function canHandleDatabaseProvider(providerId) {
                return providerId === 'custom';
            }
            export function createDatabaseExecutor() {
                return {
                    async execute() {
                        return { rowCount: 1 };
                    },
                    async executeCommand() {
                        return { rowCount: 2 };
                    },
                };
            }`,
        );

        process.env.DATABASE_URL = "custom://example";
        const executor = await createDatabaseExecutor(
            "custom",
            undefined,
            temporaryRoot,
        );

        assert.deepEqual(await executor.execute("SELECT 1"), { rowCount: 1 });
        assert.deepEqual(
            await executor.executeCommand({
                option: "DELETE",
                table: "modules",
            }),
            { rowCount: 2 },
        );
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});
