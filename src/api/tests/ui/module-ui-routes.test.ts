import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
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

const EXTERNAL_MODULES_ROOT = path.resolve(process.cwd(), "external-modules");

function createModuleRuntime(moduleUuid: string) {
    return {
        listManifests: async () => [
            {
                id: "nextcloud-whiteboard",
                uuid: moduleUuid,
                entrypoints: { ui: "./ui/index.html" },
            },
        ],
    };
}

async function createExternalModuleFixture(moduleUuid: string) {
    const moduleRoot = path.join(EXTERNAL_MODULES_ROOT, moduleUuid);
    await mkdir(path.join(moduleRoot, "ui"), { recursive: true });
    await writeFile(
        path.join(moduleRoot, "routes.json"),
        JSON.stringify([{ path: "/whiteboards", file: "ui/index.html" }]),
    );
    await writeFile(path.join(moduleRoot, "ui", "index.html"), "fixture");
    return () => rm(moduleRoot, { recursive: true, force: true });
}

test("module ui routes redirect unauthenticated requests to login", async () => {
    const moduleUuid = "b7bf4a0a-a07a-483e-a736-21f97d703ce6";
    const cleanup = await createExternalModuleFixture(moduleUuid);
    const route = createUiRoutes(createModuleRuntime(moduleUuid) as any);
    const recorder = createResponseRecorder();

    await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL("http://localhost/whiteboards"),
    );

    assert.equal(recorder.status, 302);
    assert.equal(recorder.headers.location, "/login");
    await cleanup();
});

test("module ui routes redirect revoked sessions with session_expired reason", async () => {
    const moduleUuid = "7b69febf-a703-4b91-bcbd-e6118aaf59f3";
    const cleanup = await createExternalModuleFixture(moduleUuid);
    const route = createUiRoutes(createModuleRuntime(moduleUuid) as any);
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
    await cleanup();
});

test("module ui routes skip disabled modules when isModuleEnabled returns false", async () => {
    const route = createUiRoutes(
        createModuleRuntime("10e6f091-001f-48fd-b54a-e7f55f196def") as any,
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
