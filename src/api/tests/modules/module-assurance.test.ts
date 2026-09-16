import test from "node:test";
import assert from "node:assert/strict";
import {
    assertModuleOwnedCtxRegistration,
    assertModuleOwnedRoute,
} from "../../reuse/module-assurance.js";

const unprivileged = { requested: false, trustedSource: false };
const privileged = { requested: true, trustedSource: false };

test("unprivileged modules can register only within their own namespaces", () => {
    assert.doesNotThrow(() =>
        assertModuleOwnedRoute(
            "/api/v1/modules/example/settings",
            "example",
            unprivileged,
        ),
    );
    assert.doesNotThrow(() =>
        assertModuleOwnedCtxRegistration(
            "example:resolveAccount",
            "example",
            unprivileged,
        ),
    );
    assert.throws(
        () =>
            assertModuleOwnedRoute(
                "/api/v1/modules/another/settings",
                "example",
                unprivileged,
            ),
        /module_privileged_access_required/,
    );
    assert.throws(
        () =>
            assertModuleOwnedCtxRegistration(
                "auth:resolveAccount",
                "example",
                unprivileged,
            ),
        /module_privileged_access_required/,
    );
});

test("privileged modules may request host namespace integrations", () => {
    assert.doesNotThrow(() =>
        assertModuleOwnedRoute(
            "/api/v1/integrations/example",
            "example",
            privileged,
        ),
    );
    assert.doesNotThrow(() =>
        assertModuleOwnedCtxRegistration(
            "auth:resolveAccount",
            "example",
            privileged,
        ),
    );
});
