import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();

test("tfa smtp bootstrap enables notify smtp only when smtp tfa is enabled", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/tfa/bootstrap/index.ts"),
        "utf8",
    );

    assert.match(source, /adapterId === "smtp" && enabled/);
    assert.doesNotMatch(source, /setNotifySenderEnabled\("smtp", enabled\)/);
    assert.doesNotMatch(source, /setAdapterAvailabilityCheck\(\s*"smtp"/);
    assert.doesNotMatch(source, /notify-smtp:sync-tfa-smtp/);
});
