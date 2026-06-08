import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();

test("administration components and gateways sections are excluded from composer form memory", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/administration/render-components.js"),
        "utf8",
    );

    assert.match(
        source,
        /<div class="components-section-body" data-composer-exclude-form-memory="true">/,
    );
    assert.equal(
        source.match(
            /<div class="components-section-body" data-composer-exclude-form-memory="true">/g,
        )?.length ?? 0,
        2,
    );
});
