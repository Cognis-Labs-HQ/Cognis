import assert from "node:assert/strict";
import test from "node:test";
import { requirePublicEnvironment } from "../reuse/environment.js";

test("public application environment requires external host and contact", () => {
    assert.doesNotThrow(() =>
        requirePublicEnvironment({
            EXTERNAL_HOST: "https://cognis.example.com",
            CONTACT_EMAIL: "admin@example.com",
        }),
    );
    assert.throws(
        () => requirePublicEnvironment({ CONTACT_EMAIL: "admin@example.com" }),
        /EXTERNAL_HOST is required/,
    );
    assert.throws(
        () =>
            requirePublicEnvironment({
                EXTERNAL_HOST: "https://cognis.example.com",
            }),
        /CONTACT_EMAIL is required/,
    );
});
