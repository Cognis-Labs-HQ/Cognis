import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { InMemoryTestExecutor } from "../../../../../gateways/db/tests/in-memory-test-executor.js";

function makeTemporaryDatabase() {
    const dir = mkdtempSync(path.join(tmpdir(), "cognis-profile-test-"));
    return { dir: dir, executor: new InMemoryTestExecutor() };
}
export { makeTemporaryDatabase };
