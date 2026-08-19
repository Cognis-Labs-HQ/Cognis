import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { EventEmitter } from "node:events";
import { GatewayRegistry, CapabilityStore, createCtx } from "@cognis/core";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import { UIRegistry } from "../../../api/reuse/ui-registry.js";
import { issueAccessToken } from "../../auth/access-tokens.js";
import { bootstrap } from "../bootstrap.js";

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

    constructor(options: {
        method: string;
        bearerToken?: string;
        cookieToken?: string;
    }) {
        super();
        this.method = options.method;
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
            request as any,
            response as any,
            url,
        );
        if (handled) return true;
    }
    return false;
}

async function bootstrapStudyGateway() {
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

    await bootstrap({
        capabilities,
        routeRegistry,
        uiRegistry: new UIRegistry(),
        gatewayRegistry: new GatewayRegistry(),
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
        flow: systemCtx.flow,
    } as any);

    return {
        routeRegistry,
        systemCtx,
    };
}

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

test("study registered languages reflect installed language capabilities", async () => {
    const { routeRegistry, systemCtx } = await bootstrapStudyGateway();
    const userToken = issueAccessToken("learner", "user", 60);

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
});

test("study child components come from installed language capabilities", async () => {
    const { routeRegistry, systemCtx } = await bootstrapStudyGateway();
    const userBearerToken = issueAccessToken("learner", "user", 60);

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
});

test("study adapter routes announce controls and support disable toggles", async () => {
    const { routeRegistry } = await bootstrapStudyGateway();
    const adminToken = issueAccessToken("admin-user", "admin", 60);

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
