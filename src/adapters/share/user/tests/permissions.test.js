import assert from "node:assert/strict";
import test from "node:test";
import { renderPage } from "../page.js";
import { escapeHtml } from "../../../../ui/reuse/escape-html.js";

test("user sharing presents the read permission for a resource that supports only reading", () => {
    const html = renderPage({
        labels: {},
        state: {
            supportsReadOnly: true,
            allowedPermissions: ["read"],
            permission: "read",
            recipients: [],
        },
        escapeHtml,
        gatewayFields: { password: "" },
    });
    const options = [...html.matchAll(/<option value="([^"]+)"/gu)].map(
        (match) => match[1],
    );
    assert.deepEqual(options, ["read"]);
});
