import test from "node:test";
import assert from "node:assert/strict";
import { createUiRoutes } from "../../routes/ui/index.js";
import {
    issueAccessToken,
    revokeAccessTokensForSubject,
} from "../../../gateways/auth/access-tokens.js";

function createResponseRecorder() {
    let status = 0;
    let headers: Record<string, string> = {};
    const chunks: string[] = [];
    return {
        res: {
            setHeader() {},
            writeHead(code: number, nextHeaders: Record<string, string>) {
                status = code;
                headers = nextHeaders ?? {};
            },
            end(body?: string | Buffer) {
                if (body) chunks.push(body.toString());
            },
        },
        get status() {
            return status;
        },
        get headers() {
            return headers;
        },
        get body() {
            return chunks.join("");
        },
    };
}

function createJitsiRuntime() {
    return {
        listManifests: async () => [
            {
                id: "jitsi-meet",
                entrypoints: { ui: "./ui/index.html" },
            },
        ],
    };
}

test("module ui routes redirect unauthenticated requests to login", async () => {
    const route = createUiRoutes(createJitsiRuntime() as any);
    const recorder = createResponseRecorder();

    await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL("http://localhost/meetings"),
    );

    assert.equal(recorder.status, 302);
    assert.equal(recorder.headers.location, "/login");
});

test("module ui routes redirect revoked sessions with session_expired reason", async () => {
    const route = createUiRoutes(createJitsiRuntime() as any);
    const token = issueAccessToken("u-meetings-expired", "user", 60);
    revokeAccessTokensForSubject("u-meetings-expired");
    const recorder = createResponseRecorder();

    await route(
        {
            headers: { cookie: `cognis_access_token=${token}` },
        } as any,
        recorder.res as any,
        new URL("http://localhost/meetings"),
    );

    assert.equal(recorder.status, 302);
    assert.equal(recorder.headers.location, "/login?reason=session_expired");
});
