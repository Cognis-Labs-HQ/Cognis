import test from "node:test";
import assert from "node:assert/strict";
import { formatCommandOutput, formatStructured } from "../index.ts";

test("formatStructured pretty-prints JSON strings", () => {
    assert.equal(
        formatStructured('{"data":{"status":"ok"}}'),
        '{\n  "data": {\n    "status": "ok"\n  }\n}',
    );
});

test("formatCommandOutput renders user:create with labeled fields", () => {
    const output = formatCommandOutput("user:create", {
        data: {
            username: "alice",
            isAdmin: true,
            enabled: true,
        },
    });

    assert.match(output, /^User Created/m);
    assert.match(output, /Username: alice/);
    assert.match(output, /Role: admin/);
    assert.match(output, /Status: enabled/);
});

test("formatCommandOutput renders modules:list as a table", () => {
    const output = formatCommandOutput("modules:list", {
        data: [
            {
                id: "demo",
                version: "1.2.3",
                class: "extension",
                status: "available",
            },
        ],
    });

    assert.match(output, /^Modules/m);
    assert.match(output, /ID\s+Version\s+Class\s+Status/);
    assert.match(output, /demo\s+1.2.3\s+extension\s+available/);
});
