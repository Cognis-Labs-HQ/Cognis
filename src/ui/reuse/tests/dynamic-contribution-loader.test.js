import assert from "node:assert/strict";
import test from "node:test";
import { loadDynamicContribution } from "../dynamic-contribution-loader.js";

test("dynamic contributions suppress page-entry direct mounts during import", async () => {
    const originalRouterFlag = globalThis.__spaRouter;
    const originalRouterCount = globalThis.__spaRouterCount;
    const moduleSource = `
        const guardedDuringImport = globalThis.__spaRouter === true;
        export function createContribution() {
            return { guardedDuringImport };
        }
    `;
    const scriptUrl = `data:text/javascript,${encodeURIComponent(moduleSource)}`;

    try {
        globalThis.__spaRouter = false;
        globalThis.__spaRouterCount = 0;
        const contribution = await loadDynamicContribution(
            { scriptUrl },
            { exportName: "createContribution" },
        );

        assert.equal(contribution.guardedDuringImport, true);
        assert.equal(globalThis.__spaRouter, false);
        assert.equal(globalThis.__spaRouterCount, 0);
    } finally {
        globalThis.__spaRouter = originalRouterFlag;
        globalThis.__spaRouterCount = originalRouterCount;
    }
});
