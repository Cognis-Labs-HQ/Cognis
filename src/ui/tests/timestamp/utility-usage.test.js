import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

test("account disclosures format creation and login dates through the shared timestamp utility", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/users/details.js"),
        "utf8",
    );
    assert.match(
        source,
        /import \{ formatDateTime \} from "..\/..\/reuse\/timestamp.js"/,
    );
    assert.match(source, /formatDateTime\(info.createdAt, unknown\)/);
    assert.match(source, /formatDateTime\(info.lastLogin, unknown\)/);
});
