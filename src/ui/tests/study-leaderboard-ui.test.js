import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("Study Leaderboard renders live accessible standings with movement", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/study/leaderboard/ui/app/index.js"),
        "utf8",
    );
    const styles = readFileSync(
        resolve(ROOT, "src/adapters/study/leaderboard/ui/leaderboard.css"),
        "utf8",
    );
    const adapter = readFileSync(
        resolve(ROOT, "src/adapters/study/leaderboard/index.ts"),
        "utf8",
    );
    assert.match(source, /fetchLeaderboardDefinitions/);
    assert.match(source, /fetchLeaderboardStandings/);
    assert.match(source, /screenReaderLabel/);
    assert.match(source, /leaderboard-movement--up/);
    assert.match(styles, /@keyframes leaderboard-rank-rise/);
    assert.match(styles, /prefers-reduced-motion: reduce/);
    assert.match(adapter, /\/static\/styles\/page-builder\.css/);
    assert.match(adapter, /\/static\/styles\/reuse\/page-sections\.css/);
    assert.doesNotMatch(
        adapter,
        /requiredCapabilities: \["study:leaderboard"\]/,
    );
});
