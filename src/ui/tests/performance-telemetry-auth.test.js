import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(
    resolve(process.cwd(), "src/ui/reuse/performance-telemetry.js"),
    "utf8",
);

test("performance telemetry authenticates submissions and skips signed-out clients", () => {
    assert.match(source, /localStorage\.getItem\("cognis_access_token"\)/);
    assert.match(source, /authorization: `Bearer \$\{accessToken\}`/);
    assert.doesNotMatch(source, /navigator\.sendBeacon/);
});
