import test from "node:test";
import assert from "node:assert/strict";
import { cancelTfaSetup } from "../ui/security-api.js";

for (const [status, cancelled] of [
    [204, true],
    [404, true],
    [403, false],
    [500, false],
]) {
    test(`TFA enrollment cancellation checks the server acknowledgement (${status})`, async () => {
        const result = await cancelTfaSetup(
            async (url, options) => {
                assert.equal(url, "/api/v1/tfa/methods/totp/setup/cancel");
                assert.equal(options.method, "POST");
                assert.deepEqual(JSON.parse(options.body), {
                    setupId: "temporary-enrollment",
                });
                return new Response(null, { status });
            },
            "totp",
            "temporary-enrollment",
        );
        assert.equal(result, cancelled);
    });
}

test("unavailable enrollment cancellation cannot report success", async () => {
    await assert.rejects(
        cancelTfaSetup(
            async () => {
                throw new TypeError("network unavailable");
            },
            "totp",
            "temporary-enrollment",
        ),
    );
});
