import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDbExecutor } from "../executor.js";

test("createDbExecutor loads the matching adapter factory on the fly", async () => {
    const tempRoot = await mkdtemp(
        path.join(os.tmpdir(), "cognis-db-adapter-"),
    );
    try {
        const adapterDir = path.join(tempRoot, "db", "custom");
        await mkdir(adapterDir, { recursive: true });
        await writeFile(
            path.join(adapterDir, "index.ts"),
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
        const executor = await createDbExecutor("custom", undefined, tempRoot);

        assert.deepEqual(await executor.execute("SELECT 1"), { rowCount: 1 });
        assert.deepEqual(
            await executor.executeCommand({
                option: "DELETE",
                table: "modules",
            }),
            { rowCount: 2 },
        );
    } finally {
        await rm(tempRoot, { recursive: true, force: true });
    }
});
