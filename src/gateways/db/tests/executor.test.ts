import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm as removePath, writeFile } from "node:fs/promises";
import operatingSystem from "node:os";
import path from "node:path";
import { createDbExecutor as createDatabaseExecutor } from "../executor.js";

test("createDbExecutor loads the matching adapter factory on the fly", async () => {
    const temporaryRoot = await mkdtemp(
        path.join(operatingSystem.tmpdir(), "cognis-db-adapter-"),
    );
    try {
        const adapterDirectory = path.join(temporaryRoot, "db", "custom");
        await mkdir(adapterDirectory, { recursive: true });
        await writeFile(
            path.join(adapterDirectory, "index.ts"),
            `export function canHandleDbProvider(providerId) {
                return providerId === 'custom';
            }
            export function createDbExecutor() {
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
        await removePath(temporaryRoot, { recursive: true, force: true });
    }
});
