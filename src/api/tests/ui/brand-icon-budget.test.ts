import test from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { createUiRoutes } from "../../routes/ui/index.js";
import { createCtx } from "@cognis/core";
import type { RouteContext } from "../../reuse/route-context.js";
import { createResponseRecorder } from "./ui-routes-test-helpers.js";

const origin = "http://localhost";

async function requestResource(
    route: ReturnType<typeof createUiRoutes>,
    path: string,
) {
    const response = createResponseRecorder();
    await route(
        {
            method: "GET",
            headers: { cookie: "cognis_access_token=ui-fixture" },
        } as IncomingMessage,
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

function createIconRoute(role: "admin" | "user" | null = "admin") {
    const claims = role ? { sub: "icon-fixture", role } : null;
    const context: RouteContext = {
        getAuthClaims: () => claims,
        getCookieSession: () => claims,
        requireAuth: (_request, response) => {
            if (claims) return claims;
            response.writeHead(401);
            response.end();
            return null;
        },
        requireRoleAccess: () => {
            throw new Error("Unexpected role contract");
        },
        canAccessUserData: () => {
            throw new Error("Unexpected data contract");
        },
        hasMinRole: () => {
            throw new Error("Unexpected role comparison");
        },
        setPageSecurityHeaders() {},
        lookupAccessToken: (token) => {
            assert.equal(token, "ui-fixture");
            return claims ? { ...claims, revoked: false } : null;
        },
        revokeAccessTokensForSubject: () => {
            throw new Error("No token mutation in UI fixture");
        },
        getCapability: () => undefined,
        requireCapability: () => {
            throw new Error("Unexpected capability");
        },
        flow: createCtx().flow,
    };
    return createUiRoutes(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        context,
    );
}

test("page favicons use 384px and the page header uses 512px branding", async () => {
    const route = createIconRoute();
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
        const response = await requestResource(route, page);
        const icon = response.body.match(
            /<link\b(?=[^>]*rel="icon")[^>]*href="([^"]+)"/,
        )?.[1];
        assert.ok(icon, `${page} supplies its favicon`);
        assert.match(icon, /cognis-icon-384\.png/);
        assert.ok(
            (await imageBytes(route, icon)) <= 96 * 1024,
            `${page} favicon exceeds 96 KiB`,
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
    assert.match(brand, /cognis-header-512\.png/);
    assert.ok(
        (await imageBytes(route, brand)) <= 160 * 1024,
        "shell brand exceeds 160 KiB",
    );
});

test("service worker installation retains install icons within its precache image budget", async () => {
    const route = createIconRoute();
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
    assert.ok(images.has("/static/assets/icons/cognis-icon-384.png"));
    assert.ok(images.has("/static/assets/icons/cognis-header-512.png"));
    const bytes = [...images.values()].reduce((sum, size) => sum + size, 0);
    assert.ok(bytes <= 416 * 1024, `precache images exceed 416 KiB: ${bytes}`);
});

test("injected denied and non-admin sessions retain page authorization", async () => {
    for (const role of [null, "user"] as const) {
        const route = createIconRoute(role);
        const response = createResponseRecorder();
        await route(
            {
                method: "GET",
                headers: { cookie: "cognis_access_token=ui-fixture" },
            } as IncomingMessage,
            response.res as unknown as ServerResponse,
            new URL("/administration", origin),
        );
        assert.equal(response.status, 302);
        assert.match(
            response.headers.location,
            role ? /^\/dashboard$/ : /^\/login/,
        );
    }
});

test("normal and maskable image variants retain their declared PNG dimensions", async () => {
    for (const suffix of ["", "-maskable"]) {
        const image = await readFile(
            new URL(
                `../../../ui/public/assets/icons/cognis-icon${suffix}-384.png`,
                import.meta.url,
            ),
        );
        assert.equal(image.readUInt32BE(16), 384);
        assert.equal(image.readUInt32BE(20), 384);
        assert.equal(image[25], 6, "RGBA preserves transparency");
    }
});

test("header artwork retains the original aspect ratio at 512px height", async () => {
    const original = await readFile(
        new URL(
            "../../../ui/public/assets/icons/cognis-icon.png",
            import.meta.url,
        ),
    );
    const header = await readFile(
        new URL(
            "../../../ui/public/assets/icons/cognis-header-512.png",
            import.meta.url,
        ),
    );
    const sourceWidth = original.readUInt32BE(16);
    const sourceHeight = original.readUInt32BE(20);
    assert.equal(header.readUInt32BE(20), 512);
    assert.equal(
        header.readUInt32BE(16),
        Math.round((sourceWidth * 512) / sourceHeight),
    );
    assert.equal(header[25], 6, "header retains RGBA transparency");
});
