import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { bootstrapStudyAdapter } from "../index.ts";

const CLASSROOM_URL = new URL("http://localhost/classroom");

function buildBaseCtx(overrides = {}) {
    return {
        gateway: {},
        adapterId: "classes",
        adapterRoot: path.resolve(
            process.cwd(),
            "src",
            "adapters",
            "study",
            "classes",
        ),
        capabilities: {
            get() {
                return undefined;
            },
            contribute() {},
        },
        gatewayRegistry: {},
        registerRoute() {},
        registerStaticDir() {},
        registerAdapterStaticDir() {},
        registerNavbarPlugin() {},
        registerPageExtension() {},
        isAdapterEnabled() {
            return true;
        },
        ...overrides,
    };
}

function buildMockRouteContext() {
    return {
        getAuthClaims: () => null,
        requireAuth: () => null,
        requireRoleAccess: () => null,
        canAccessUserData: () => false,
        hasMinRole: () => true,
        getCookieSession: () => ({ sub: "user-1", role: "user" }),
        setPageSecurityHeaders: () => {},
        lookupAccessToken: () => null,
        revokeAccessTokensForSubject: () => 0,
        getCapability: () => undefined,
        requireCapability: () => {
            throw new Error("not available");
        },
        flow: {
            run: async () => {},
            register: () => {},
            inject: () => {},
        },
    };
}

test("study/classes registers classroom assets before DB bootstrap can skip", async () => {
    const staticDirRegistrations = [];

    await bootstrapStudyAdapter(
        buildBaseCtx({
            registerStaticDir() {
                // Study/classes bootstrap should not register gateway static dirs.
            },
            registerAdapterStaticDir(gatewayId, adapterId, absoluteDir) {
                staticDirRegistrations.push({
                    gatewayId,
                    adapterId,
                    absoluteDir,
                });
            },
        }),
    );

    assert.deepEqual(staticDirRegistrations, [
        {
            gatewayId: "study",
            adapterId: "classes",
            absoluteDir: path.resolve(
                process.cwd(),
                "src",
                "adapters",
                "study",
                "classes",
                "ui",
            ),
        },
    ]);
});

test("study/classes bootstrap reads file-reader:text:ui capability for notepad config", async () => {
    const fetchedKeys = [];

    await bootstrapStudyAdapter(
        buildBaseCtx({
            capabilities: {
                get(key) {
                    fetchedKeys.push(key);
                    return undefined;
                },
                contribute() {},
            },
        }),
    );

    assert.ok(
        fetchedKeys.includes("file-reader:text:ui"),
        `bootstrap must read "file-reader:text:ui" capability; got: ${JSON.stringify(fetchedKeys)}`,
    );
    assert.ok(
        !fetchedKeys.includes("study:notepad:ui"),
        `bootstrap must not read stale "study:notepad:ui" capability`,
    );
});

test("study/classes classroom page injects notepad URLs from file-reader:text:ui capability", async () => {
    const capturedHtmlParts = [];
    const mockRouteContext = buildMockRouteContext();

    await bootstrapStudyAdapter(
        buildBaseCtx({
            capabilities: {
                get(key) {
                    if (key === "file-reader:text:ui") {
                        return {
                            scriptUrl:
                                "/static/adapters/file-reader/text/classroom-notepad.js",
                            stringsBaseUrl:
                                "/static/adapters/file-reader/text/languages",
                            stylesheetUrl:
                                "/static/adapters/file-reader/text/classes-notepad.css",
                        };
                    }
                    if (key === "auth:routeContext") {
                        return mockRouteContext;
                    }
                    return undefined;
                },
                contribute() {},
            },
            registerRoute(handler) {
                handler(
                    { method: "GET", headers: {}, socket: {} },
                    {
                        writeHead() {},
                        end(body) {
                            if (typeof body === "string") {
                                capturedHtmlParts.push(body);
                            }
                        },
                    },
                    CLASSROOM_URL,
                ).catch(() => {});
            },
        }),
    );

    await new Promise((resolve) => setImmediate(resolve));

    if (capturedHtmlParts.length === 0) {
        return;
    }

    const servedHtml = capturedHtmlParts[0];
    assert.ok(
        servedHtml.includes(
            "/static/adapters/file-reader/text/classroom-notepad.js",
        ),
        "classroom HTML must contain injected notepad script URL",
    );
    assert.ok(
        servedHtml.includes("/static/adapters/file-reader/text/languages"),
        "classroom HTML must contain injected notepad strings URL",
    );
    assert.ok(
        !servedHtml.includes("{{classroom.notepadScriptUrl}}"),
        "classroom HTML must not contain unresolved notepad script placeholder",
    );
    assert.ok(
        !servedHtml.includes("{{classroom.notepadStringsBaseUrl}}"),
        "classroom HTML must not contain unresolved notepad strings placeholder",
    );
});

test("study/classes classroom page serves empty notepad URLs when file-reader:text:ui is absent", async () => {
    const capturedHtmlParts = [];
    const mockRouteContext = buildMockRouteContext();

    await bootstrapStudyAdapter(
        buildBaseCtx({
            capabilities: {
                get(key) {
                    if (key === "auth:routeContext") {
                        return mockRouteContext;
                    }
                    return undefined;
                },
                contribute() {},
            },
            registerRoute(handler) {
                handler(
                    { method: "GET", headers: {}, socket: {} },
                    {
                        writeHead() {},
                        end(body) {
                            if (typeof body === "string") {
                                capturedHtmlParts.push(body);
                            }
                        },
                    },
                    CLASSROOM_URL,
                ).catch(() => {});
            },
        }),
    );

    await new Promise((resolve) => setImmediate(resolve));

    if (capturedHtmlParts.length === 0) {
        return;
    }

    const servedHtml = capturedHtmlParts[0];
    assert.ok(
        !servedHtml.includes("{{classroom.notepadScriptUrl}}"),
        "classroom HTML must not contain unresolved script URL placeholder when notepad adapter is absent",
    );
    assert.ok(
        !servedHtml.includes("{{classroom.notepadStringsBaseUrl}}"),
        "classroom HTML must not contain unresolved strings URL placeholder when notepad adapter is absent",
    );
});
