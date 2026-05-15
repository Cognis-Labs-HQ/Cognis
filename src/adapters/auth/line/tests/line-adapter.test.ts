import test from "node:test";
import assert from "node:assert/strict";
import { createAdapter } from "../index.js";

test("line adapter config schema includes PKCE/mobile fields", () => {
    const adapter = createAdapter();
    const keys = adapter.getConfigSchema().map((field) => field.key);
    assert.ok(keys.includes("channelId"));
    assert.ok(keys.includes("redirectUri"));
    assert.ok(keys.includes("usePkce"));
});

test("line adapter schema provides hints for channelId and redirectUri", () => {
    const adapter = createAdapter();
    const schema = adapter.getConfigSchema();
    const channelIdField = schema.find((field) => field.key === "channelId");
    const redirectUriField = schema.find(
        (field) => field.key === "redirectUri",
    );
    assert.ok(
        channelIdField?.hint,
        "channelId schema field should carry a hint",
    );
    assert.ok(
        redirectUriField?.hint,
        "redirectUri schema field should carry a hint",
    );
});

test("line adapter exposes a Cognis-managed redirect path and registers its callback route", async () => {
    const adapter = createAdapter() as ReturnType<typeof createAdapter> & {
        getManagedRedirectPath(): string;
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
    assert.equal(adapter.getManagedRedirectPath(), "/auth/line/callback");

    let registeredHandler:
        | ((req: { method?: string }, res: any, url: URL) => Promise<boolean>)
        | null = null;
    adapter.registerRoutes({
        registerRoute(handler) {
            registeredHandler = handler;
        },
    });

    assert.ok(
        registeredHandler,
        "line adapter should register a callback route",
    );

    let statusCode = 0;
    let allowHeader = "";
    let payload = "unset";
    const handled = await registeredHandler!(
        { method: "GET" },
        {
            writeHead(code: number, headers?: Record<string, string>) {
                statusCode = code;
                allowHeader = headers?.allow ?? "";
            },
            end(nextPayload = "") {
                payload = nextPayload;
            },
        },
        new URL("http://localhost/auth/line/callback"),
    );
    assert.equal(handled, true);
    assert.equal(statusCode, 204);
    assert.equal(payload, "");
    assert.equal(allowHeader, "");
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
