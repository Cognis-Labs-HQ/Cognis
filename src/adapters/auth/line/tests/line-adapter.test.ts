import test from "node:test";
import assert from "node:assert/strict";
import { createAdapter } from "../index.js";

test("line adapter config schema includes required fields and PKCE toggle", () => {
    const adapter = createAdapter();
    const keys = adapter.getConfigSchema().map((field) => field.key);
    assert.ok(keys.includes("channelId"));
    assert.ok(keys.includes("usePkce"));
    assert.equal(
        keys.includes("redirectUri"),
        false,
        "redirectUri must not appear in schema — it is managed by Cognis via the built-in callback route",
    );
});

test("line adapter channelId schema field carries a descriptive hint", () => {
    const adapter = createAdapter();
    const schema = adapter.getConfigSchema();
    const channelIdField = schema.find((field) => field.key === "channelId");
    assert.ok(
        channelIdField?.hint,
        "channelId schema field should carry a hint",
    );
});

test("line adapter exposes a Cognis-managed redirect path", () => {
    const adapter = createAdapter() as ReturnType<typeof createAdapter> & {
        getManagedRedirectPath(): string;
    };
    assert.equal(adapter.getManagedRedirectPath(), "/auth/line/callback");
});

test("line adapter init route returns 503 when channelId is not configured", async () => {
    const adapter = createAdapter() as ReturnType<typeof createAdapter> & {
        registerRoutes(context: {
            registerRoute(
                handler: (
                    req: { method?: string },
                    res: {
                        writeHead(
                            code: number,
                            headers?: Record<string, string>,
                        ): void;
                        end(payload?: string): void;
                    },
                    url: URL,
                ) => Promise<boolean>,
            ): void;
        }): void;
    };

    const registeredHandlers: Array<
        (req: { method?: string }, res: any, url: URL) => Promise<boolean>
    > = [];
    adapter.registerRoutes({
        registerRoute(handler) {
            registeredHandlers.push(handler);
        },
    });

    const initHandler = registeredHandlers[0];
    assert.ok(initHandler, "init route handler should be registered");

    let statusCode = 0;
    let responseBody = "";
    const handled = await initHandler(
        {
            method: "GET",
            headers: {
                host: "localhost:3000",
            },
        } as any,
        {
            writeHead(code: number) {
                statusCode = code;
            },
            end(payload = "") {
                responseBody = payload;
            },
        },
        new URL("http://localhost/api/v1/auth/line/init"),
    );
    assert.equal(handled, true);
    assert.equal(statusCode, 503);
    const parsed = JSON.parse(responseBody);
    assert.equal(parsed.error.code, "not_configured");
});

test("line adapter init route returns channel metadata when configured", async () => {
    const adapter = createAdapter() as ReturnType<typeof createAdapter> & {
        registerRoutes(context: {
            registerRoute(
                handler: (
                    req: { method?: string },
                    res: {
                        writeHead(
                            code: number,
                            headers?: Record<string, string>,
                        ): void;
                        end(payload?: string): void;
                    },
                    url: URL,
                ) => Promise<boolean>,
            ): void;
        }): void;
    };
    adapter.configure({ channelId: "test-channel", usePkce: true });

    const registeredHandlers: Array<
        (req: { method?: string }, res: any, url: URL) => Promise<boolean>
    > = [];
    adapter.registerRoutes({
        registerRoute(handler) {
            registeredHandlers.push(handler);
        },
    });

    const initHandler = registeredHandlers[0];
    let statusCode = 0;
    let responseBody = "";
    const handled = await initHandler(
        {
            method: "GET",
            headers: {
                host: "localhost:3000",
            },
        } as any,
        {
            writeHead(code: number) {
                statusCode = code;
            },
            end(payload = "") {
                responseBody = payload;
            },
        },
        new URL("http://localhost/api/v1/auth/line/init"),
    );
    assert.equal(handled, true);
    assert.equal(statusCode, 200);
    const parsed = JSON.parse(responseBody);
    assert.equal(parsed.data.channelId, "test-channel");
    assert.equal(parsed.data.managedRedirectPath, "/auth/line/callback");
    assert.equal(
        parsed.data.callbackUrl,
        "http://localhost:3000/auth/line/callback",
    );
    assert.equal(typeof parsed.data.authorizationEndpoint, "string");
    assert.ok(parsed.data.authorizationEndpoint.length > 0);
    assert.equal(parsed.data.usePkce, true);
    assert.equal(typeof parsed.data.scope, "string");
});

test("line adapter callback route serves HTML handoff page when code param is present", async () => {
    const adapter = createAdapter() as ReturnType<typeof createAdapter> & {
        registerRoutes(context: {
            registerRoute(
                handler: (
                    req: { method?: string },
                    res: {
                        writeHead(
                            code: number,
                            headers?: Record<string, string>,
                        ): void;
                        end(payload?: string): void;
                    },
                    url: URL,
                ) => Promise<boolean>,
            ): void;
        }): void;
    };

    const registeredHandlers: Array<
        (req: { method?: string }, res: any, url: URL) => Promise<boolean>
    > = [];
    adapter.registerRoutes({
        registerRoute(handler) {
            registeredHandlers.push(handler);
        },
    });

    const callbackHandler = registeredHandlers[1];
    assert.ok(callbackHandler, "callback route handler should be registered");

    let statusCode = 0;
    let contentType = "";
    let responseBody = "";
    const handled = await callbackHandler(
        { method: "GET" },
        {
            writeHead(code: number, headers?: Record<string, string>) {
                statusCode = code;
                contentType = headers?.["content-type"] ?? "";
            },
            end(payload = "") {
                responseBody = payload;
            },
        },
        new URL("http://localhost/auth/line/callback?code=abc&state=xyz"),
    );
    assert.equal(handled, true);
    assert.equal(statusCode, 200);
    assert.ok(
        contentType.startsWith("text/html"),
        "callback with code should respond with HTML",
    );
    assert.ok(
        responseBody.includes("<!DOCTYPE html>"),
        "response should be a complete HTML document",
    );
});

test("line adapter callback route returns 204 when no code param is present", async () => {
    const adapter = createAdapter() as ReturnType<typeof createAdapter> & {
        registerRoutes(context: {
            registerRoute(
                handler: (
                    req: { method?: string },
                    res: {
                        writeHead(
                            code: number,
                            headers?: Record<string, string>,
                        ): void;
                        end(payload?: string): void;
                    },
                    url: URL,
                ) => Promise<boolean>,
            ): void;
        }): void;
    };

    const registeredHandlers: Array<
        (req: { method?: string }, res: any, url: URL) => Promise<boolean>
    > = [];
    adapter.registerRoutes({
        registerRoute(handler) {
            registeredHandlers.push(handler);
        },
    });

    const callbackHandler = registeredHandlers[1];
    let statusCode = 0;
    let responseBody = "unset";
    const handled = await callbackHandler(
        { method: "GET" },
        {
            writeHead(code: number) {
                statusCode = code;
            },
            end(payload = "") {
                responseBody = payload;
            },
        },
        new URL("http://localhost/auth/line/callback"),
    );
    assert.equal(handled, true);
    assert.equal(statusCode, 204);
    assert.equal(responseBody, "");
});

test("line adapter authenticates via authorization code and syncs profile fields", async () => {
    const adapter = createAdapter() as ReturnType<typeof createAdapter> & {
        setClient(client: {
            exchangeAuthorizationCode(input: {
                authorizationCode: string;
                codeVerifier?: string;
                redirectUri: string;
                channelId: string;
                channelSecret: string;
            }): Promise<{ access_token: string; id_token: string }>;
            fetchProfile(accessToken: string): Promise<{
                userId: string;
                displayName: string;
                pictureUrl: string;
            }>;
            verifyIdToken(
                idToken: string,
                channelId: string,
            ): Promise<{
                sub: string;
                email: string;
            }>;
        }): void;
    };
    adapter.configure({
        channelId: "line-channel",
        channelSecret: "line-secret",
        redirectUri: "https://example.com/auth/line/callback",
        usePkce: true,
    });
    adapter.setClient({
        async exchangeAuthorizationCode() {
            return {
                access_token: "line-access-token",
                id_token: "line-id-token",
            };
        },
        async fetchProfile() {
            return {
                userId: "U1234567890",
                displayName: "Line User",
                pictureUrl: "https://profile.line-scdn.net/example",
            };
        },
        async verifyIdToken() {
            return {
                sub: "U1234567890",
                email: "line.user@example.com",
            };
        },
    });

    const context = await adapter.authenticate({
        authorizationCode: "line-auth-code",
        codeVerifier: "line-code-verifier",
    });
    assert.ok(context);
    assert.equal(context?.provider, "line");
    assert.equal(context?.accountId, "line:U1234567890");
    assert.equal(context?.displayName, "Line User");
    assert.equal(
        context?.profileImageUrl,
        "https://profile.line-scdn.net/example",
    );
    assert.equal(context?.email, "line.user@example.com");
    assert.equal(context?.lifecycleState, "active");
});

test("line adapter maps lifecycle state from provider data", async () => {
    const adapter = createAdapter() as ReturnType<typeof createAdapter> & {
        setClient(client: {
            exchangeAuthorizationCode(input: {
                authorizationCode: string;
                codeVerifier?: string;
                redirectUri: string;
                channelId: string;
                channelSecret: string;
            }): Promise<{ access_token: string; id_token?: string }>;
            fetchProfile(accessToken: string): Promise<{
                userId: string;
                displayName: string;
                status: string;
            }>;
            verifyIdToken(): Promise<null>;
        }): void;
    };
    adapter.configure({
        channelId: "line-channel",
        redirectUri: "https://example.com/auth/line/callback",
    });
    adapter.setClient({
        async exchangeAuthorizationCode() {
            return { access_token: "line-access-token" };
        },
        async fetchProfile() {
            return {
                userId: "U-deactivated",
                displayName: "Deactivated User",
                status: "deactivated",
            };
        },
        async verifyIdToken() {
            return null;
        },
    });

    const context = await adapter.authenticate({
        authorizationCode: "line-auth-code",
    });
    assert.equal(context?.lifecycleState, "deactivated");
});
