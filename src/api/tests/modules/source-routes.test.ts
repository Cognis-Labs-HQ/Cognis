import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createModuleSourceRoutes } from "../../routes/modules/sources.js";

function fixture() {
    let configured = false;
    const calls: string[] = [];
    const marketplace = {
        listSources: async () => {
            calls.push("list");
            return [{ uuid: "source", credentialConfigured: configured }];
        },
        saveSource: async (
            _source: unknown,
            credential: { token?: string },
        ) => {
            calls.push("save");
            configured ||= Boolean(credential.token);
            return { uuid: "source", credentialConfigured: configured };
        },
        removeSource: async () => {
            calls.push("remove");
        },
        validateSourceCredential: async () => {
            calls.push("validate");
            return { valid: true };
        },
        getSettings: async () => ({
            recommendedModulesUrl: "https://example.test/modules",
        }),
        saveSettings: async () => ({
            recommendedModulesUrl: "https://example.test/modules",
        }),
    };
    const route = createModuleSourceRoutes(
        marketplace as Parameters<typeof createModuleSourceRoutes>[0],
        {
            requireAuth(req, res, role) {
                assert.equal(role, "admin");
                const sub = String(req.headers.authorization ?? "");
                if (sub.startsWith("admin-")) return { sub, role: "admin" };
                res.writeHead(403);
                res.end();
                return null;
            },
        },
    );
    async function request(
        method: string,
        path: string,
        actor: string,
        body = {},
    ) {
        let status = 0;
        let content = "";
        const req = Object.assign(Readable.from([JSON.stringify(body)]), {
            method,
            headers: { authorization: actor },
        });
        const res = {
            writeHead: (value: number) => {
                status = value;
            },
            end: (value = "") => {
                content = value;
            },
        };
        const handled = await route(
            req as IncomingMessage,
            res as ServerResponse,
            new URL(path, "https://example.test"),
        );
        return {
            handled,
            status,
            content,
            payload: content ? JSON.parse(content) : null,
        };
    }
    return { request, calls, marketplace };
}

test("every module source operation requires the injected administrator guard before reading or mutating", async () => {
    const host = fixture();
    for (const [method, path] of [
        ["GET", "/api/v1/modules/sources"],
        ["POST", "/api/v1/modules/sources"],
        ["POST", "/api/v1/modules/sources/validate-credential"],
        ["DELETE", "/api/v1/modules/sources/source"],
        ["GET", "/api/v1/modules/settings"],
        ["PUT", "/api/v1/modules/settings"],
    ]) {
        assert.equal((await host.request(method, path, "user")).status, 403);
    }
    assert.deepEqual(host.calls, []);
});

test("source configuration receipts are shared across administrators and exclude submitted credentials", async () => {
    const host = fixture();
    const saved = await host.request(
        "POST",
        "/api/v1/modules/sources",
        "admin-one",
        { uuid: "source", token: "test-private-PAT" },
    );
    assert.equal(saved.status, 200);
    assert.deepEqual(saved.payload.data, {
        uuid: "source",
        credentialConfigured: true,
    });
    const listed = await host.request(
        "GET",
        "/api/v1/modules/sources",
        "admin-two",
    );
    assert.deepEqual(listed.payload.data, [saved.payload.data]);
    const retained = await host.request(
        "POST",
        "/api/v1/modules/sources",
        "admin-two",
        { uuid: "source", token: "" },
    );
    assert.deepEqual(retained.payload.data, saved.payload.data);
});

test("invalid source changes and private implementation errors return safe operation failures", async () => {
    const host = fixture();
    const invalid = await host.request(
        "POST",
        "/api/v1/modules/sources",
        "admin-one",
        { clearCredential: "yes" },
    );
    assert.equal(invalid.status, 400);
    host.marketplace.saveSource = async () => {
        throw new Error("private credential or storage path");
    };
    const failed = await host.request(
        "POST",
        "/api/v1/modules/sources",
        "admin-one",
    );
    assert.equal(failed.status, 503);
    assert.equal(failed.payload.error.code, "module_source_operation_failed");
    assert.equal(failed.content.includes("private credential"), false);
});
