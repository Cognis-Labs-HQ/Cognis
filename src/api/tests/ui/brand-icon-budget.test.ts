import test from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { createUiRoutes } from "../../routes/ui/index.js";
import {
    issueAccessToken,
    revokeAccessTokensForSubject,
} from "../../../gateways/auth/access-tokens.js";
import { createResponseRecorder } from "./ui-routes-test-helpers.js";

const origin = "http://localhost";

async function requestResource(
    route: ReturnType<typeof createUiRoutes>,
    path: string,
    cookie = "",
) {
    const response = createResponseRecorder();
    await route(
        { method: "GET", headers: { cookie } } as IncomingMessage,
        response.res as unknown as ServerResponse,
        new URL(path, origin),
    );
    assert.equal(response.status, 200, path);
    return response;
}

async function imageBytes(
    route: ReturnType<typeof createUiRoutes>,
    path: string,
) {
    const response = await requestResource(route, path);
    assert.match(String(response.headers["content-type"]), /^image\/png/);
    const bytes = Number(response.headers["content-length"]);
    assert.ok(bytes > 0, `image has a positive served length: ${path}`);
    return bytes;
}

test("page favicons and the shell brand use images within the small-icon budget", async (context) => {
    const route = createUiRoutes();
    const subject = "brand-icon-budget";
    const token = issueAccessToken(subject, "admin", 60);
    context.after(() => revokeAccessTokensForSubject(subject));
    for (const page of [
        "/dashboard",
        "/settings",
        "/administration/modules",
        "/docs",
        "/license",
        "/error",
        "/users",
        "/administration",
    ]) {
        const response = await requestResource(
            route,
            page,
            `cognis_access_token=${token}`,
        );
        const icon = response.body.match(
            /<link\b(?=[^>]*rel="icon")[^>]*href="([^"]+)"/,
        )?.[1];
        assert.ok(icon, `${page} supplies its favicon`);
        assert.ok(
            (await imageBytes(route, icon)) <= 40 * 1024,
            `${page} favicon exceeds 40 KiB`,
        );
    }
    const template = await requestResource(
        route,
        "/static/templates/dashboard-layout.html",
    );
    const brand = template.body.match(
        /<img\b(?=[^>]*class="topbar-icon")[^>]*src="([^"]+)"/,
    )?.[1];
    assert.ok(brand, "the shell renders its brand image");
    assert.ok(
        (await imageBytes(route, brand)) <= 40 * 1024,
        "shell brand exceeds 40 KiB",
    );
});

test("service worker installation retains install icons within its precache image budget", async () => {
    const route = createUiRoutes();
    const handlers = new Map();
    const images = new Map<string, number>();
    vm.runInNewContext(
        await readFile(
            new URL("../../../ui/public/sw.js", import.meta.url),
            "utf8",
        ),
        {
            URL,
            Response,
            fetch: async (url: string) => {
                if (url === "/static/offline-manifest.json")
                    return Response.json([]);
                if (url === "/api/v1/ui/offline-routes")
                    return Response.json({ data: [] });
                if (url.startsWith("/static/assets/"))
                    images.set(url, await imageBytes(route, url));
                return new Response("public asset");
            },
            self: {
                location: { origin },
                addEventListener: (type: string, handler: unknown) =>
                    handlers.set(type, handler),
            },
            caches: {
                open: async () => ({
                    put: async () => {},
                    keys: async () => [],
                }),
            },
            console: {
                warn: (...args: unknown[]) =>
                    assert.fail(`precache failed: ${args}`),
            },
        },
    );
    let installed;
    handlers.get("install")({
        waitUntil: (pending: Promise<void>) => {
            installed = pending;
        },
    });
    await installed;
    assert.ok(images.has("/static/assets/icons/cognis-icon-192.png"));
    assert.ok(images.has("/static/assets/icons/cognis-icon-512.png"));
    const bytes = [...images.values()].reduce((sum, size) => sum + size, 0);
    assert.ok(bytes <= 192 * 1024, `precache images exceed 192 KiB: ${bytes}`);
});
