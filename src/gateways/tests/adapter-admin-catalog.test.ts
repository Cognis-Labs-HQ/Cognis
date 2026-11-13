import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
    createLockedAdapterAdminRoutes,
    loadAdapterAdminCatalog,
} from "../reuse/adapter-admin-catalog.js";

test("locked adapter catalogs expose file, database, and logging adapters", async () => {
    const adaptersRoot = path.resolve(process.cwd(), "src", "adapters");
    const catalogs = await Promise.all(
        ["file", "db", "logging"].map((family) =>
            loadAdapterAdminCatalog(adaptersRoot, family),
        ),
    );

    assert.deepEqual(
        catalogs.map((catalog) => catalog.map(({ id }) => id).sort()),
        [
            ["local", "quota"],
            ["mariadb", "memory", "postgres", "sqlite"],
            ["console", "file"],
        ],
    );

    const route = createLockedAdapterAdminRoutes("logging", catalogs[2], {
        requireAuth: () => ({ sub: "admin" }),
    } as never);
    let status = 0;
    let payload = "";
    const handled = await route(
        { method: "GET" } as never,
        {
            writeHead(nextStatus: number) {
                status = nextStatus;
            },
            end(body: string) {
                payload = body;
            },
        } as never,
        new URL("http://localhost/api/v1/gateways/logging/adapters"),
    );

    assert.equal(handled, true);
    assert.equal(status, 200);
    const response = JSON.parse(payload) as {
        data: Array<{
            id: string;
            active: boolean;
            locked: boolean;
            controls: { config: string; enable: string; disable: string };
        }>;
    };
    assert.deepEqual(
        response.data.map(({ id, active, locked }) => ({ id, active, locked })),
        [
            { id: "console", active: true, locked: true },
            { id: "file", active: true, locked: true },
        ],
    );
    assert.equal(
        response.data[0]?.controls.config,
        "/api/v1/gateways/logging/adapters/console/config",
    );
});

test("database adapter catalog only marks the configured provider active", async () => {
    const adapters = await loadAdapterAdminCatalog(
        path.resolve(process.cwd(), "src", "adapters"),
        "db",
    );
    const route = createLockedAdapterAdminRoutes(
        "db",
        adapters,
        { requireAuth: () => ({ sub: "admin" }) } as never,
        "mariadb",
    );
    let payload = "";

    await route(
        { method: "GET" } as never,
        {
            writeHead() {},
            end(body: string) {
                payload = body;
            },
        } as never,
        new URL("http://localhost/api/v1/gateways/db/adapters"),
    );

    const response = JSON.parse(payload) as {
        data: Array<{ id: string; active: boolean; locked: boolean }>;
    };
    assert.deepEqual(
        response.data.map(({ id, active, locked }) => ({
            id,
            active,
            locked,
        })),
        [
            { id: "memory", active: false, locked: true },
            { id: "mariadb", active: true, locked: true },
            { id: "postgres", active: false, locked: true },
            { id: "sqlite", active: false, locked: true },
        ],
    );
});
