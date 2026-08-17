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

function createModuleRuntime() {
    return {
        listManifests: async () => [
            {
                id: "nextcloud-whiteboard",
                entrypoints: { ui: "./ui/index.html" },
            },
        ],
    };
}

test("module ui routes redirect unauthenticated requests to login", async () => {
    const route = createUiRoutes(createModuleRuntime() as any);
    const recorder = createResponseRecorder();

    await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL("http://localhost/whiteboards"),
    );

    assert.equal(recorder.status, 302);
    assert.equal(recorder.headers.location, "/login");
});

test("module ui routes redirect revoked sessions with session_expired reason", async () => {
    const route = createUiRoutes(createModuleRuntime() as any);
    const token = issueAccessToken("u-meetings-expired", "user", 60);
    revokeAccessTokensForSubject("u-meetings-expired");
    const recorder = createResponseRecorder();

    await route(
        {
            headers: { cookie: `cognis_access_token=${token}` },
        } as any,
        recorder.res as any,
        new URL("http://localhost/whiteboards"),
    );

    assert.equal(recorder.status, 302);
    assert.equal(recorder.headers.location, "/login?reason=session_expired");
});

test("module ui routes skip disabled modules when isModuleEnabled returns false", async () => {
    const route = createUiRoutes(
        createModuleRuntime() as any,
        undefined,
        undefined,
        undefined,
        (moduleId) => moduleId !== "nextcloud-whiteboard",
    );
    const token = issueAccessToken("u-disabled-module", "user", 60);
    const recorder = createResponseRecorder();

    await route(
        {
            method: "GET",
            headers: { cookie: `cognis_access_token=${token}` },
        } as any,
        recorder.res as any,
        new URL("http://localhost/whiteboards"),
    );

    assert.equal(recorder.status, 302);
    assert.equal(recorder.headers.location, "/error?code=404");
});
