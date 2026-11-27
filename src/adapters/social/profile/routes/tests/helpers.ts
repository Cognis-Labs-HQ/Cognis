import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { InMemoryTestExecutor } from "../../../../../gateways/db/tests/in-memory-test-executor.js";

function makeTemporaryDatabase() {
    const directory = mkdtempSync(path.join(tmpdir(), "cognis-profile-test-"));
    return { dir: directory, executor: new InMemoryTestExecutor() };
}
export { makeTemporaryDatabase as makeTempDb };
