import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { EventEmitter } from "node:events";
import { GatewayRegistry, CapabilityStore } from "@cognis/core";
import { RouteRegistry } from "../../../api/route-registry.js";
import { UIRegistry } from "../../../api/ui-registry.js";
import { issueAccessToken } from "../../auth/access-tokens.js";
import { bootstrap } from "../bootstrap.js";
import type { StructuredDbCommand } from "../../db/reuse/db-command.js";

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

function createDbExecutor(moduleStates: Map<string, boolean>) {
    return {
        async executeCommand(command: StructuredDbCommand) {
            if (
                command.option === "SELECT" &&
                command.table === "modules" &&
                Array.isArray(command.where)
            ) {
                const moduleIdFilter = command.where.find(
                    (clause) => clause.column === "module_id",
                );
                const moduleId =
                    typeof moduleIdFilter?.value === "string"
                        ? moduleIdFilter.value
                        : null;
                if (!moduleId) {
                    return { rows: [], rowCount: 0 };
                }
                if (!moduleStates.has(moduleId)) {
                    return { rows: [], rowCount: 0 };
                }
                return {
                    rows: [{ enabled: moduleStates.get(moduleId) ? 1 : 0 }],
                    rowCount: 1,
                };
            }
            return { rows: [], rowCount: 0 };
        },
        async ensureTable() {},
        async transaction<T>(callback: (executor: any) => Promise<T>) {
            return callback(this);
        },
    };
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

async function bootstrapStudyGateway(moduleStates: Map<string, boolean>) {
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    capabilities.contribute("db:executor", createDbExecutor(moduleStates));

    await bootstrap({
        capabilities,
        routeRegistry,
        uiRegistry: new UIRegistry(),
        gatewayRegistry: new GatewayRegistry(),
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
    } as any);

    return { routeRegistry };
}

test("study registered languages reflect Japanese module enablement state", async () => {
    const moduleStates = new Map<string, boolean>();
    const { routeRegistry } = await bootstrapStudyGateway(moduleStates);
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

    moduleStates.set("study-language-ja", true);

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

test("study Japanese child routes are only active while module is enabled", async () => {
    const moduleStates = new Map<string, boolean>();
    const { routeRegistry } = await bootstrapStudyGateway(moduleStates);
    const userBearerToken = issueAccessToken("learner", "user", 60);
    const userCookieToken = issueAccessToken("learner", "user", 60);

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

    const disabledPageResponse = new ResponseRecorder();
    const disabledPageHandled = await dispatchRoute(
        routeRegistry,
        new RequestRecorder({ method: "GET", cookieToken: userCookieToken }),
        disabledPageResponse,
        new URL("http://localhost/study/ja/hiragana"),
    );

    assert.equal(disabledPageHandled, false);

    moduleStates.set("study-language-ja", true);

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

    const enabledPageResponse = new ResponseRecorder();
    const enabledPageHandled = await dispatchRoute(
        routeRegistry,
        new RequestRecorder({ method: "GET", cookieToken: userCookieToken }),
        enabledPageResponse,
        new URL("http://localhost/study/ja/hiragana"),
    );

    assert.equal(enabledPageHandled, true);
    assert.equal(enabledPageResponse.statusCode, 200);
});
