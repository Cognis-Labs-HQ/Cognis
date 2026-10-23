import assert from "node:assert/strict";
import test from "node:test";
import { createModuleRoutes } from "../../routes/modules/index.js";

for (const role of ["admin", "user"] as const) {
    test(`module ID conflict diagnostics enforce ${role} authorization`, async () => {
        const installedUuid = "cc810afb-4fe6-5ef7-8f0b-e23676e01db3";
        const requestedUuid = "ffff9d5d-c7c3-4f8c-a5e5-3997dac19ad1";
        const logs: Array<Record<string, unknown>> = [];
        let listCalls = 0;
        let installs = 0;
        const route = createModuleRoutes(
            {
                list: async () => {
                    listCalls++;
                    return [{ id: "line-auth", uuid: installedUuid }];
                },
            } as never,
            { log: (_level, _message, metadata) => logs.push(metadata ?? {}) },
            {
                requireAuth(_request, response, minRole) {
                    assert.equal(minRole, "admin");
                    if (role !== "admin") {
                        response.writeHead(403);
                        response.end(
                            JSON.stringify({ error: { code: "forbidden" } }),
                        );
                        return null;
                    }
                    return { sub: "tester", role };
                },
            } as never,
            {
                install: async () => {
                    installs++;
                },
            } as never,
        );
        let status = 0;
        let body = "";
        await route(
            {
                method: "POST",
                headers: {
                    authorization: "Bearer test-token",
                },
                async *[Symbol.asyncIterator]() {
                    yield Buffer.from(
                        JSON.stringify({
                            module: { id: "line-auth", uuid: requestedUuid },
                        }),
                    );
                },
            } as never,
            {
                writeHead(code: number) {
                    status = code;
                },
                end(payload: string) {
                    body = payload;
                },
            } as never,
            new URL("http://localhost/api/v1/modules/install"),
        );
        assert.equal(installs, 0);
        if (role === "user") {
            assert.equal(status, 403);
            assert.equal(listCalls, 0);
            return;
        }
        assert.equal(status, 409);
        assert.equal(listCalls, 1);
        assert.deepEqual(JSON.parse(body).error.conflict, {
            moduleId: "line-auth",
            installedModuleUuid: installedUuid,
            requestedModuleUuid: requestedUuid,
        });
        assert.equal(logs[0].installedModuleUuid, installedUuid);
        assert.equal(logs[0].requestedModuleUuid, requestedUuid);
    });
}

test("updating the same module identity is accepted", async () => {
    const identity = {
        id: "line-auth",
        uuid: "ffff9d5d-c7c3-4f8c-a5e5-3997dac19ad1",
    };
    let installs = 0;
    const route = createModuleRoutes(
        { list: async () => [identity] } as never,
        undefined,
        { requireAuth: () => ({ sub: "tester", role: "admin" }) } as never,
        {
            install: async () => {
                installs++;
                return identity;
            },
        } as never,
    );
    let status = 0;
    await route(
        {
            method: "POST",
            async *[Symbol.asyncIterator]() {
                yield Buffer.from(JSON.stringify({ module: identity }));
            },
        } as never,
        {
            writeHead(code: number) {
                status = code;
            },
            end() {},
        } as never,
        new URL("http://localhost/api/v1/modules/install"),
    );
    assert.equal(status, 202);
    assert.equal(installs, 1);
});
