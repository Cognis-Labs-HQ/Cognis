import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ProfileTestExecutor } from "../../tests/reuse/executor.js";

export function makeTempDb() {
    const dir = mkdtempSync(path.join(tmpdir(), "cognis-profile-test-"));
    return { dir, executor: new ProfileTestExecutor() };
}
