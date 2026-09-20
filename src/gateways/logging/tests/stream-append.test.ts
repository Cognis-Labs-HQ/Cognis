import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { EventEmitter } from "node:events";
import { GatewayRegistry, CapabilityStore } from "@cognis/core";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import { UIRegistry } from "../../../api/reuse/ui-registry.js";
import { issueAccessToken } from "../../auth/access-tokens.js";
import { bootstrap } from "../bootstrap.js";
import type { Logger } from "../logger.js";
import type { DbExecutor } from "../../db/reuse/db-executor.js";
import type { StructuredDbCommand } from "../../db/reuse/db-command.js";

class PreferenceDb implements DbExecutor {
    readonly preferences = new Map<string, string>();

    async ensureTable() {}

    async executeCommand(command: StructuredDbCommand) {
        if (command.option === "SELECT") {
            return {
                rows: [...this.preferences].map(
                    ([adapter_id, config_json]) => ({
                        adapter_id,
                        config_json,
                    }),
                ),
            };
        }
        if (command.option === "INSERT") {
            this.preferences.set(
                String(command.values.adapter_id),
                String(command.values.config_json),
            );
        }
        if (command.option === "DELETE") {
            this.preferences.delete(String(command.where?.[0]?.value));
        }
        return { rowCount: 1 };
    }

    async transaction<Result>(
        callback: (executor: DbExecutor) => Promise<Result>,
    ): Promise<Result> {
        return callback(this);
    }
}

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
        if (chunk) this.payload += String(chunk);
        this.emit("close");
    }
}

class RequestRecorder extends EventEmitter {
    method: string;
    headers: Record<string, string>;
    body: string;

    constructor(method: string, token?: string, body = "") {
        super();
        this.method = method;
        this.headers = token ? { authorization: `Bearer ${token}` } : {};
        this.body = body;
    }

    async *[Symbol.asyncIterator]() {
        if (this.body) yield Buffer.from(this.body);
    }
}

async function makeContext(dbExecutor: DbExecutor = new PreferenceDb()) {
    const capabilities = new CapabilityStore();
    capabilities.contribute("db:executor", dbExecutor);
    capabilities.contribute("file:append", async () => undefined);
    return {
        gatewayRegistry: new GatewayRegistry(),
        routeRegistry: new RouteRegistry(),
        capabilities,
        uiRegistry: new UIRegistry(),
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
    };
}

test("logging stream route emits appended log entries during an open stream", async () => {
    const tempRoot = await mkdtemp(path.join(tmpdir(), "cognis-logging-test-"));
    const logPath = path.join(tempRoot, "app.log");
    const previousLogFile = process.env.LOG_FILE;
    process.env.LOG_FILE = logPath;

    try {
        await writeFile(
            logPath,
            `${JSON.stringify({
                ts: "2026-05-09T00:00:00.000Z",
                level: "info",
                message: "Initial snapshot entry",
            })}\n`,
            "utf8",
        );

        const ctx = await makeContext();
        await bootstrap(ctx as any);

        const handlers = ctx.routeRegistry.getHandlers();
        const streamHandler = handlers[0];
        const token = issueAccessToken("admin-test", "admin", 300);
        const req = new RequestRecorder("GET", token);
        const res = new ResponseRecorder();

        const handled = await streamHandler(
            req as any,
            res as any,
            new URL("/api/v1/logging/stream", "http://localhost"),
        );

        assert.equal(handled, true);
        assert.match(res.payload, /Initial snapshot entry/);

        await writeFile(
            logPath,
            [
                JSON.stringify({
                    ts: "2026-05-09T00:00:00.000Z",
                    level: "info",
                    message: "Initial snapshot entry",
                }),
                JSON.stringify({
                    ts: "2026-05-09T00:00:02.000Z",
                    level: "warn",
                    message: "Polled incremental entry",
                }),
            ].join("\n") + "\n",
            "utf8",
        );

        await new Promise((resolve) => setTimeout(resolve, 1700));

        assert.match(res.payload, /Polled incremental entry/);

        req.emit("close");
        res.emit("close");
    } finally {
        if (previousLogFile === undefined) {
            delete process.env.LOG_FILE;
        } else {
            process.env.LOG_FILE = previousLogFile;
        }
        await rm(tempRoot, { recursive: true, force: true });
    }
});
