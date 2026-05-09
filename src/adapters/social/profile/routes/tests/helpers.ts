import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { SqliteExecutor } from "../../../../../gateways/db/executor.js";

export function makeTempDb() {
    const dir = mkdtempSync(path.join(tmpdir(), "cognis-profile-test-"));
    return { dir, executor: new SqliteExecutor(path.join(dir, "test.sqlite")) };
}
