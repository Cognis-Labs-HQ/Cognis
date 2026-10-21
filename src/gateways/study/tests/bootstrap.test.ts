import { writeAdapterFixture } from "./reuse/adapters.js";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { EventEmitter } from "node:events";
import {
    GatewayRegistry,
    CapabilityStore,
    createCtx,
    hasMinRole,
    type AccessRole,
} from "@cognis/core";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import { UIRegistry } from "../../../api/reuse/ui-registry.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import { bootstrap } from "../bootstrap.js";

const credentials = new Map<string, { sub: string; role: AccessRole }>();

function issueCredential(sub: string, role: AccessRole): string {
    const token = `test-session-${credentials.size}`;
    credentials.set(token, { sub, role });
    return token;
}

const cookieClaims = (request: IncomingMessage) =>
    credentials.get(
        request.headers.cookie?.match(/cognis_access_token=([^;]+)/)?.[1] ?? "",
    ) ?? null;

const routeContext = {
    getCookieSession: cookieClaims,
    requireAuth(
        request: IncomingMessage,
        response: ServerResponse,
        minimum: AccessRole = "user",
    ) {
        const claims =
            credentials.get(
                request.headers.authorization?.replace(/^Bearer /, "") ?? "",
            ) ?? cookieClaims(request);
        if (claims && hasMinRole(claims.role, minimum)) return claims;
        response.writeHead(claims ? 403 : 401, {
            "content-type": "application/json",
        });
        response.end(
            JSON.stringify({ error: claims ? "forbidden" : "unauthorized" }),
        );
        return null;
    },
};

class ResponseRecorder extends EventEmitter {
    statusCode = 0;
    headers: Record<string, string> = {};
    payload = "";

    writeHead(code: number, headers?: Record<string, string>) {
        this.statusCode = code;
        this.headers = { ...this.headers, ...(headers ?? {}) };
    }

    setHeader(name: string, value: string) {
        this.headers[name.toLowerCase()] = value;
    }

    write(chunk: string | Buffer) {
        this.payload += String(chunk);
        return true;
    }

    end(chunk?: string | Buffer) {
        if (chunk) {
            this.payload += String(chunk);
        }
        this.emit("close");
    }
}

class RequestRecorder extends EventEmitter {
    method: string;
    headers: Record<string, string>;
    body?: unknown;

    async *[Symbol.asyncIterator]() {
        if (this.body !== undefined)
            yield Buffer.from(JSON.stringify(this.body));
    }

    constructor(options: {
        method: string;
        bearerToken?: string;
        cookieToken?: string;
        body?: unknown;
    }) {
        super();
        this.method = options.method;
        this.body = options.body;
        this.headers = {};
        if (options.bearerToken) {
            this.headers.authorization = `Bearer ${options.bearerToken}`;
        }
        if (options.cookieToken) {
            this.headers.cookie = `cognis_access_token=${encodeURIComponent(options.cookieToken)}`;
        }
    }
}

async function dispatchRoute(
    routeRegistry: RouteRegistry,
    request: RequestRecorder,
    response: ResponseRecorder,
    url: URL,
): Promise<boolean> {
    for (const routeEntry of routeRegistry.getEntries()) {
        const handled = await routeEntry.handler(
            request as unknown as IncomingMessage,
            response as unknown as ServerResponse,
            url,
        );
        if (handled) return true;
    }
    return false;
}

async function bootstrapStudyGateway(
    configure?: (capabilities: CapabilityStore) => void,
) {
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const systemCtx = createCtx();
    const dbExecutor = {
        executeCommand: async () => ({ rows: [], rowCount: 0 }),
        ensureTable: async () => {},
        transaction: async (
            callback: (executor: unknown) => Promise<unknown>,
        ) => callback(dbExecutor),
    };
    capabilities.contribute("db:executor", dbExecutor);
    capabilities.contribute("system:ctx", systemCtx);
    capabilities.contribute("auth:routeContext", routeContext);
    configure?.(capabilities);

    const adaptersRoot = await mkdtemp(path.join(tmpdir(), "study-bootstrap-"));
    const directory = path.join(adaptersRoot, "study");
    await mkdir(directory);
    for (const id of ["library", "progress", "drawing", "classes"])
        await writeAdapterFixture(directory, { id }, "configured");
    const uiRegistry = new UIRegistry();
    try {
        await bootstrap({
            capabilities,
            routeRegistry,
            uiRegistry,
            gatewayRegistry: new GatewayRegistry(),
            adaptersRoot,
            flow: systemCtx.flow,
        });
    } finally {
        await rm(adaptersRoot, { recursive: true, force: true });
    }

    return {
        capabilities,
        routeRegistry,
        systemCtx,
        uiRegistry,
    };
}

test("Study registers executable drawing progress routes when account preferences are available", async () => {
    const { systemCtx, routeRegistry } = await bootstrapStudyGateway(
        (capabilities) => {
            capabilities.contribute("preferences:store", {
                get: async () => null,
                set: async () => {},
                clearUser: async () => {},
            });
        },
    );
    assert.equal(systemCtx.hasFlow("study:drawing:readProgress"), true);
    assert.equal(systemCtx.hasFlow("study:drawing:complete"), true);
    const response = new ResponseRecorder();
    assert.equal(
        await dispatchRoute(
            routeRegistry,
            new RequestRecorder({
                method: "GET",
                cookieToken: issueCredential("learner", "user"),
            }),
            response,
            new URL("http://localhost/api/v1/study/drawing/card-a"),
        ),
        true,
    );
    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.payload), {
        data: { completed: false, hiddenStrokeCount: 0 },
    });
});

test("Study owns its SPA routes and Library detail-flow provider", async () => {
    const { uiRegistry, systemCtx } = await bootstrapStudyGateway();
    const routes = uiRegistry.listSpaRoutes();
    assert.equal(
        routes.some((route) => route.id === "gateway.study"),
        false,
    );
    assert.equal(
        routes.some((route) => route.id === "gateway.study.child"),
        false,
    );
    assert.ok(
        uiRegistry.hasActiveCapabilityProvider("study:library:detailFlow"),
    );
    assert.ok(uiRegistry.hasActiveCapabilityProvider("study:subPages"));
    systemCtx.contributePublicCapability(
        "study:language:ja",
        japaneseLanguageCapability,
    );
    const enabledRoutes = uiRegistry.listSpaRoutes();
    assert.equal(
        enabledRoutes.some((route) => route.id === "gateway.study"),
        true,
    );
    assert.equal(
        enabledRoutes.some((route) => route.id === "gateway.study.child"),
        true,
    );
});

const japaneseLanguageCapability = {
    moduleId: "study-language-ja",
    languageCode: "ja",
    languageName: "日本語",
    languageFlag: "🇯🇵",
    version: "1.2.12",
    childComponents: [
        {
            id: "hiragana-alphabet",
            label: "Hiragana Alphabet",
            pageUrl: "/study/hiragana",
            order: 0,
        },
    ],
};

test("direct Study requests redirect to unavailable when no language is valid", async () => {
    const { routeRegistry } = await bootstrapStudyGateway();
    const response = new ResponseRecorder();
    const handled = await dispatchRoute(
        routeRegistry,
        new RequestRecorder({
            method: "GET",
            cookieToken: issueCredential("learner", "user"),
        }),
        response,
        new URL("http://localhost/study/hiragana"),
    );

    assert.equal(handled, true);
    assert.equal(response.statusCode, 302);
    assert.equal(response.headers.location, "/error?code=503");
});

test("study registered languages reflect installed language capabilities", async () => {
    const { capabilities, routeRegistry, systemCtx } =
        await bootstrapStudyGateway();
    const userToken = issueCredential("learner", "user");

    const disabledResponse = new ResponseRecorder();
    const disabledHandled = await dispatchRoute(
        routeRegistry,
        new RequestRecorder({ method: "GET", bearerToken: userToken }),
        disabledResponse,
        new URL("http://localhost/api/v1/study/registered-languages"),
    );

    assert.equal(disabledHandled, true);
    assert.equal(disabledResponse.statusCode, 200);
    assert.deepEqual(JSON.parse(disabledResponse.payload), { data: [] });

    systemCtx.contributePublicCapability(
        "study:language:ja",
        japaneseLanguageCapability,
    );

    const enabledResponse = new ResponseRecorder();
    const enabledHandled = await dispatchRoute(
        routeRegistry,
        new RequestRecorder({ method: "GET", bearerToken: userToken }),
        enabledResponse,
        new URL("http://localhost/api/v1/study/registered-languages"),
    );

    assert.equal(enabledHandled, true);
    assert.equal(enabledResponse.statusCode, 200);
    const enabledPayload = JSON.parse(enabledResponse.payload) as {
        data: Array<{ code: string }>;
    };
    assert.equal(
        enabledPayload.data.some((language) => language.code === "ja"),
        true,
    );

    capabilities.get<(moduleId: string, enabled: boolean) => void>(
        "modules:onStateChanged",
    )?.("study-language-ja", false);
    const lifecycleDisabledResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        new RequestRecorder({ method: "GET", bearerToken: userToken }),
        lifecycleDisabledResponse,
        new URL("http://localhost/api/v1/study/registered-languages"),
    );
    assert.deepEqual(JSON.parse(lifecycleDisabledResponse.payload), {
        data: [],
    });

    systemCtx.removeCapability("study:language:ja");
    const removedResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        new RequestRecorder({ method: "GET", bearerToken: userToken }),
        removedResponse,
        new URL("http://localhost/api/v1/study/registered-languages"),
    );
    assert.deepEqual(JSON.parse(removedResponse.payload), { data: [] });
});

test("study child components come from installed language capabilities", async () => {
    const { routeRegistry, systemCtx } = await bootstrapStudyGateway();
    const userBearerToken = issueCredential("learner", "user");

    const disabledModulesResponse = new ResponseRecorder();
    const disabledModulesHandled = await dispatchRoute(
        routeRegistry,
        new RequestRecorder({ method: "GET", bearerToken: userBearerToken }),
        disabledModulesResponse,
        new URL("http://localhost/api/v1/study/languages/ja/modules"),
    );

    assert.equal(disabledModulesHandled, true);
    assert.equal(disabledModulesResponse.statusCode, 200);
    assert.deepEqual(JSON.parse(disabledModulesResponse.payload), { data: [] });

    systemCtx.contributePublicCapability(
        "study:language:ja",
        japaneseLanguageCapability,
    );

    const enabledModulesResponse = new ResponseRecorder();
    const enabledModulesHandled = await dispatchRoute(
        routeRegistry,
        new RequestRecorder({ method: "GET", bearerToken: userBearerToken }),
        enabledModulesResponse,
        new URL("http://localhost/api/v1/study/languages/ja/modules"),
    );

    assert.equal(enabledModulesHandled, true);
    assert.equal(enabledModulesResponse.statusCode, 200);
    const enabledModulesPayload = JSON.parse(
        enabledModulesResponse.payload,
    ) as {
        data: Array<{ id: string }>;
    };
    assert.equal(enabledModulesPayload.data.length > 0, true);
    assert.equal(
        enabledModulesPayload.data.some(
            (childComponent) => childComponent.id === "hiragana-alphabet",
        ),
        true,
    );

    systemCtx.contributePublicCapability("study:language:ja", {
        ...japaneseLanguageCapability,
        childComponents: [
            {
                id: "updated-library",
                label: "Updated Library",
                pageUrl: "/study/library",
            },
        ],
    });
    const refreshedResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        new RequestRecorder({ method: "GET", bearerToken: userBearerToken }),
        refreshedResponse,
        new URL("http://localhost/api/v1/study/languages/ja/modules"),
    );
    const refreshedPayload = JSON.parse(refreshedResponse.payload) as {
        data: Array<{ id: string }>;
    };
    assert.deepEqual(
        refreshedPayload.data.map((component) => component.id),
        ["updated-library"],
    );
});

test("study adapter routes announce controls and support disable toggles", async () => {
    const { routeRegistry } = await bootstrapStudyGateway();
    const adminToken = issueCredential("admin-user", "admin");

    const listResponse = new ResponseRecorder();
    const listHandled = await dispatchRoute(
        routeRegistry,
        new RequestRecorder({ method: "GET", bearerToken: adminToken }),
        listResponse,
        new URL("http://localhost/api/v1/gateways/study/adapters"),
    );

    assert.equal(listHandled, true);
    assert.equal(listResponse.statusCode, 200);
    const listPayload = JSON.parse(listResponse.payload) as {
        data: Array<{
            id: string;
            active: boolean;
            controls?: Record<string, string>;
        }>;
    };
    const classesAdapter = listPayload.data.find(
        (adapter) => adapter.id === "classes",
    );
    assert.equal(
        classesAdapter?.controls?.config,
        "/api/v1/gateways/study/adapters/classes/config",
    );
    assert.equal(
        classesAdapter?.controls?.disable,
        "/api/v1/gateways/study/adapters/classes/disable",
    );

    const disableResponse = new ResponseRecorder();
    const disableHandled = await dispatchRoute(
        routeRegistry,
        new RequestRecorder({ method: "POST", bearerToken: adminToken }),
        disableResponse,
        new URL(
            "http://localhost/api/v1/gateways/study/adapters/classes/disable",
        ),
    );

    assert.equal(disableHandled, true);
    assert.equal(disableResponse.statusCode, 200);
    assert.match(disableResponse.payload, /"enabled":false/);

    const updatedListResponse = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        new RequestRecorder({ method: "GET", bearerToken: adminToken }),
        updatedListResponse,
        new URL("http://localhost/api/v1/gateways/study/adapters"),
    );
    const updatedPayload = JSON.parse(updatedListResponse.payload) as {
        data: Array<{ id: string; active: boolean }>;
    };
    const updatedClassesAdapter = updatedPayload.data.find(
        (adapter) => adapter.id === "classes",
    );
    assert.equal(updatedClassesAdapter?.active, false);
});

test("Study registers an executable Library move flow before advertising the provider", async () => {
    const { systemCtx } = await bootstrapStudyGateway();
    const stages: string[] = [];
    for (const stage of ["authorize", "validate", "move", "audit"]) {
        systemCtx.flow.extend(
            "study:library:move",
            stage,
            { id: `test:${stage}` },
            () => {
                stages.push(stage);
                return {};
            },
        );
    }
    await systemCtx.flow.run("study:library:move", {
        entryId: "authored-card",
    });
    assert.deepEqual(stages, ["authorize", "validate", "move", "audit"]);
});

test("Study registers an executable dictionary search flow", async () => {
    const { systemCtx } = await bootstrapStudyGateway();
    const stages: string[] = [];
    for (const stage of ["authorize", "validate", "search", "audit"]) {
        systemCtx.flow.extend(
            "study:library:search",
            stage,
            { id: `test:${stage}` },
            () => {
                stages.push(stage);
                return {};
            },
        );
    }
    await systemCtx.flow.run("study:library:search", { query: "word" });
    assert.deepEqual(stages, ["authorize", "validate", "search", "audit"]);
});

test("the registered drawing endpoint records canonical results through the restored Progress capability", async () => {
    const { capabilities, routeRegistry } = await bootstrapStudyGateway(
        (capabilities) => {
            capabilities.contribute("preferences:store", {
                get: async () => null,
                set: async () => {},
                clearUser: async () => {},
            });
        },
    );
    const events: Array<{
        actor: { accountId: string };
        input: {
            content: { contentId: string };
            correct: boolean;
            independentCorrect: boolean;
        };
    }> = [];
    capabilities.contribute("study:library", {
        read: async (_actor: unknown, id: string) => ({
            id,
            schemaId: "japanese",
            layer: "kanji",
            language: "ja",
        }),
    });
    capabilities.contribute("study:progress", {
        recordPractice: async (
            actor: { accountId: string },
            input: (typeof events)[number]["input"],
        ) => {
            events.push({ actor, input });
        },
    });
    const response = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        new RequestRecorder({
            method: "POST",
            cookieToken: issueCredential("learner", "user"),
            body: {
                strokeCount: 4,
                mistakes: 0,
                result: "correct",
                assisted: true,
            },
        }),
        response,
        new URL("http://localhost/api/v1/study/drawing/card-a"),
    );
    assert.equal(response.statusCode, 200);
    assert.equal(events.length, 1);
    assert.equal(events[0].actor.accountId, "learner");
    assert.equal(events[0].input.content.contentId, "card-a");
    assert.equal(events[0].input.correct, true);
    assert.equal(events[0].input.independentCorrect, false);
});

test("drawing requests are unavailable when their Progress dependency is disabled", async () => {
    const { routeRegistry } = await bootstrapStudyGateway((capabilities) => {
        const values = new Map<string, string>();
        capabilities.contribute("preferences:store", {
            get: async (accountId: string, key: string) =>
                values.get(JSON.stringify([accountId, key])) ?? null,
            set: async (accountId: string, key: string, value: string) => {
                values.set(JSON.stringify([accountId, key]), value);
            },
            clearUser: async () => values.clear(),
        });
    });
    const disabled = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        new RequestRecorder({
            method: "POST",
            bearerToken: issueCredential("admin", "admin"),
        }),
        disabled,
        new URL(
            "http://localhost/api/v1/gateways/study/adapters/progress/disable",
        ),
    );
    assert.equal(disabled.statusCode, 200);
    const response = new ResponseRecorder();
    await dispatchRoute(
        routeRegistry,
        new RequestRecorder({
            method: "POST",
            cookieToken: issueCredential("learner", "user"),
            body: { strokeCount: 1, mistakes: 0 },
        }),
        response,
        new URL("http://localhost/api/v1/study/drawing/card-a"),
    );
    assert.equal(response.statusCode, 503);
    assert.equal(JSON.parse(response.payload).error, "adapter_disabled");
});

test("Study management routes honor the injected authentication context", async () => {
    const guarded: Array<string | undefined> = [];
    const { routeRegistry } = await bootstrapStudyGateway((capabilities) => {
        capabilities.contribute("auth:routeContext", {
            ...routeContext,
            requireAuth(request: IncomingMessage, response: ServerResponse) {
                guarded.push(request.method);
                response.writeHead(401);
                response.end(JSON.stringify({ error: "custom_guard" }));
                return null;
            },
        });
    });
    for (const [method, pathname] of [
        ["GET", "/api/v1/gateways/study/adapters"],
        ["POST", "/api/v1/gateways/study/adapters/drawing/disable"],
        ["GET", "/api/v1/study/registered-languages"],
    ]) {
        const response = new ResponseRecorder();
        await dispatchRoute(
            routeRegistry,
            new RequestRecorder({
                method,
                bearerToken: issueCredential("admin", "admin"),
            }),
            response,
            new URL(`http://localhost${pathname}`),
        );
        assert.equal(response.statusCode, 401);
        assert.equal(JSON.parse(response.payload).error, "custom_guard");
    }
    assert.deepEqual(guarded, ["GET", "POST", "GET"]);
});

test("Study fails before registering routes when its authentication contract is missing", async () => {
    await assert.rejects(
        bootstrapStudyGateway((capabilities) =>
            capabilities.contribute("auth:routeContext", undefined),
        ),
        /auth_route_context_unavailable/,
    );
});
