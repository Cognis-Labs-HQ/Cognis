import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { mountUsers } from "./fixtures/mount.js";

const translations = new Set(
    [
        ...readFileSync(
            new URL("../../languages/en/strings.xml", import.meta.url),
            "utf8",
        ).matchAll(/name="([^"]+)"/g),
    ].map((match) => match[1]),
);

for (const [status, code] of [
    [503, "account_policy_unavailable"],
    [400, "bad_request"],
    [403, "protected_admin_account"],
    [404, "not_found"],
]) {
    for (const field of ["code", "message"]) {
        test(`Users role ${status} response ${field} is presented through the localized failure label`, async () => {
            let changes = 0;
            const requestedKeys = [];
            const state = await mountUsers({
                i18n: {
                    t(key) {
                        requestedKeys.push(key);
                        if (!translations.has(key))
                            throw new Error(`missing_translation:${key}`);
                        return `translated:${key}`;
                    },
                },
                changeRole: async () => {
                    changes++;
                    return Response.json(
                        { error: { [field]: code } },
                        { status },
                    );
                },
            });
            await assert.doesNotReject(state.handlers.get("role:change")());
            assert.equal(changes, 1);
            assert.deepEqual(state.notices, [
                {
                    message: "translated:ui.reuse.save_failed",
                    variant: "error",
                },
            ]);
            assert.equal(state.refreshes(), 1);
            assert.equal(requestedKeys.includes(code), false);
        });
    }
}
