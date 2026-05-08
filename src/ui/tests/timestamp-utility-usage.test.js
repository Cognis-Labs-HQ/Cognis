import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("users popup formats member and login timestamps via timestamp utility", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/users/index.js"),
        "utf8",
    );

    assert.ok(
        source.includes(
            'import { formatDate, formatDateTime } from "../../reuse/timestamp.js";',
        ),
    );
    assert.match(source, /formatMemberSince\(info\?\.createdAt \?\? null\)/);
    assert.match(source, /formatLastLogin\(info\?\.lastLogin \?\? null\)/);
});

test("administration registration table formats invite expiry timestamps via timestamp utility", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/registration/ui/admin-section.js"),
        "utf8",
    );

    assert.ok(
        source.includes(
            'import { formatDateTime } from "/static/reuse/timestamp.js";',
        ),
    );
    assert.match(source, /formatDateTime\(token\.expiresAt\)/);
    assert.doesNotMatch(source, /toLocaleString\(/);
});
