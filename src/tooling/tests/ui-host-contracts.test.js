import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { checkUiHostContracts } from "../scripts/check-ui-host-contracts.mjs";

test("external callbacks can import standalone navigation from the host entry module", async () => {
    await checkUiHostContracts(async (url) => {
        assert.equal(url, "/static/reuse/page-entry.js");
        return readFile(
            new URL("../../ui/reuse/page-entry.js", import.meta.url),
            "utf8",
        );
    });
});

test("release validation rejects an incompatible callback host", async () => {
    await assert.rejects(
        checkUiHostContracts(
            async () => "export function mountWhenDirect() {}",
        ),
        /must export navigateToDocument; deploy the matching host/,
    );
});

test("release validation accepts minified aliases without executing browser code", async () => {
    await checkUiHostContracts(
        async () => `
        throw new Error("Browser module must not execute in the release checker");
        function a() {} function b() {}
        export { a as mountWhenDirect, b as navigateToDocument };
    `,
    );
});

test("an export name in a comment or private declaration does not satisfy the contract", async () => {
    await assert.rejects(
        checkUiHostContracts(
            async () => `
            export function mountWhenDirect() {}
            // export function navigateToDocument() {}
            function navigateToDocument() {}
        `,
        ),
        /must export navigateToDocument/,
    );
});
