import test from "node:test";
import assert from "node:assert/strict";
import { createModuleMarketplaceStateRoute } from "../../routes/modules/marketplace-state.js";

function fixture() {
    const state = {
        role: "admin",
        status: "enabled",
        revision: "original",
        recommended: true,
        sourceRevision: "source-1",
        assetsRead: 0,
    };
    const route = createModuleMarketplaceStateRoute({
        moduleService: {
            list: async () => [
                { id: "example", uuid: "example", class: "extension" },
            ],
        } as any,
        marketplace: {
            listSources: async () => [
                { uuid: "source", revision: state.sourceRevision },
            ],
            listRecommendedModuleUuids: async () =>
                state.recommended ? ["example"] : [],
            listCachedModules: async () => [
                {
                    id: "example",
                    uuid: "example",
                    name: "module.example.name",
                    ui: { stringsBaseUrl: "/module/languages" },
                    assetIds: { strings: { en: state.revision } },
                },
            ],
            getAsset: async () => {
                state.assetsRead++;
                return {
                    body: Buffer.from("strings"),
                    contentType: "application/xml",
                };
            },
        } as any,
        ctx: {
            requireAuth(_req, res, minimum) {
                assert.equal(minimum, "admin");
                if (state.role === "admin")
                    return { sub: "administrator", role: "admin" };
                res.writeHead(403);
                res.end();
                return null;
            },
        },
        restartRequiredModules: new Set(),
        getStatus: () => state.status as "enabled" | "disabled",
    });
    async function request(etag?: string) {
        let status = 0,
            body = "";
        let headers: Record<string, string> = {};
        assert.equal(
            await route(
                { method: "GET", headers: { "if-none-match": etag } } as any,
                {
                    writeHead(
                        code: number,
                        values: Record<string, string> = {},
                    ) {
                        status = code;
                        headers = values;
                    },
                    end(value = "") {
                        body = value;
                    },
                } as any,
                new URL("http://localhost/api/v1/modules/marketplace-state"),
            ),
            true,
        );
        return {
            status,
            headers,
            body,
            data: body ? JSON.parse(body).data : undefined,
        };
    }
    return { state, request };
}

test("unchanged idle polls have no payload and do not reload catalog assets", async () => {
    const { state, request } = fixture();
    const first = await request();
    assert.equal(first.status, 200);
    assert.equal(first.data.installed[0].status, "enabled");
    assert.equal(first.data.cached[0].recommended, true);
    assert.match(first.data.cached[0].ui.stringsRevision, /^[a-f0-9]{64}$/);
    const reads = state.assetsRead;
    for (let poll = 0; poll < 120; poll++) {
        const idle = await request(first.headers.etag);
        assert.equal(idle.status, 304);
        assert.equal(idle.body, "");
        assert.equal(idle.headers["cache-control"], "private, no-cache");
    }
    assert.equal(state.assetsRead, reads);
});

test("status, source, recommendation and translation changes invalidate the displayed state", async () => {
    const { state, request } = fixture();
    let previous = await request();
    for (const mutate of [
        () => {
            state.status = "disabled";
        },
        () => {
            state.sourceRevision = "source-2";
        },
        () => {
            state.recommended = false;
        },
        () => {
            state.revision = "updated";
        },
    ]) {
        mutate();
        const next = await request(previous.headers.etag);
        assert.equal(next.status, 200);
        assert.notEqual(next.headers.etag, previous.headers.etag);
        if (state.revision === "updated")
            assert.notEqual(
                next.data.cached[0].ui.stringsRevision,
                previous.data.cached[0].ui.stringsRevision,
            );
        previous = next;
    }
});

test("conditional reads still require administrator access", async () => {
    const { state, request } = fixture();
    const first = await request();
    state.role = "user";
    const denied = await request(first.headers.etag);
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.etag, undefined);
    assert.equal(denied.body, "");
});
