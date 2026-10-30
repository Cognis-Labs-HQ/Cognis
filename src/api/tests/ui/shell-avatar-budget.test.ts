import test from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createUiRoutes } from "../../routes/ui/index.js";
import { createResponseRecorder } from "./ui-routes-test-helpers.js";

test("shell placeholder avatar is served within its image transfer budget", async () => {
    const route = createUiRoutes();
    const request = { method: "GET", headers: {} } as IncomingMessage;
    const template = createResponseRecorder();
    await route(
        request,
        template.res as unknown as ServerResponse,
        new URL("http://localhost/static/templates/dashboard-layout.html"),
    );
    assert.equal(template.status, 200);
    const avatar = template.body.match(
        /<img\b[^>]*class="avatar-image"[^>]*>/,
    )?.[0];
    assert.ok(
        avatar,
        "the shell provides a placeholder before the profile provider resolves",
    );
    const source = avatar.match(/src="([^"]+)"/)?.[1];
    assert.ok(source);
    const asset = createResponseRecorder();
    await route(
        request,
        asset.res as unknown as ServerResponse,
        new URL(source, "http://localhost"),
    );
    assert.equal(asset.status, 200);
    assert.match(String(asset.headers["content-type"]), /^image\//);
    const bytes = Number(asset.headers["content-length"]);
    assert.ok(
        bytes > 0 && bytes <= 64 * 1024,
        `placeholder image exceeds 64 KiB: ${bytes} bytes`,
    );
});
