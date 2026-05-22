import test from "node:test";
import assert from "node:assert/strict";
import { buildServer } from "../../server.js";

test("buildServer requires injected route context", () => {
    assert.throws(
        () =>
            buildServer({
                moduleRuntimeGateway: {} as any,
            }),
        /route_context_missing/,
    );
});
