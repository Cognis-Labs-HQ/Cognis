import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { EventEmitter } from "node:events";
import { GatewayRegistry, CapabilityStore } from "@cognis/core";
import { RouteRegistry } from "../../../api/route-registry.js";
import { UIRegistry } from "../../../api/ui-registry.js";
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
        if (chunk) this.payload += String(chunk);
        this.emit("close");
    }
}

class RequestRecorder extends EventEmitter {
    method: string;
    headers: Record<string, string>;

    constructor(method: string, token?: string) {
        super();
        this.method = method;
        this.headers = token ? { authorization: `Bearer ${token}` } : {};
    }
}

async function makeContext() {
    return {
        gatewayRegistry: new GatewayRegistry(),
        routeRegistry: new RouteRegistry(),
        capabilities: new CapabilityStore(),
        uiRegistry: new UIRegistry(),
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
    };
}

test("logging gateway bootstrap registers admin logs section and static UI script", async () => {
    const ctx = await makeContext();

    await bootstrap(ctx as any);

    const sections = ctx.uiRegistry.listAdminSections();
    const logsSection = sections.find((section) => section.id === "logs");
    assert.ok(logsSection);
    assert.equal(
        logsSection?.scriptUrl,
        "/static/gateways/logging/admin-section.js",
    );

    const staticDir = ctx.uiRegistry.getStaticDir("logging");
    assert.ok(staticDir);
    await assert.doesNotReject(
        access(path.join(staticDir!, "admin-section.js")),
    );
});

test("logging stream route requires admin auth", async () => {
    const ctx = await makeContext();
    await bootstrap(ctx as any);

    const handlers = ctx.routeRegistry.getHandlers();
    const streamHandler = handlers[0];
    const req = new RequestRecorder("GET");
    const res = new ResponseRecorder();

    const handled = await streamHandler(
        req as any,
        res as any,
        new URL("/api/v1/logging/stream", "http://localhost"),
    );

    assert.equal(handled, true);
    assert.equal(res.statusCode, 401);
});

test("logging stream route returns filtered event stream logs", async () => {
    const tempRoot = await mkdtemp(path.join(tmpdir(), "cognis-logging-test-"));
    const logPath = path.join(tempRoot, "app.log");
    const previousLogFile = process.env.LOG_FILE;
    process.env.LOG_FILE = logPath;

    try {
        await writeFile(
            logPath,
            [
                JSON.stringify({
                    ts: "2026-05-09T00:00:00.000Z",
                    level: "info",
                    message: "User listed gateways",
                    component: "api-gateways",
                }),
                JSON.stringify({
                    ts: "2026-05-09T00:00:01.000Z",
                    level: "error",
                    message: "SQL execution failed",
                    component: "db",
                }),
            ].join("\n") + "\n",
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
            new URL(
                "/api/v1/logging/stream?severity=error&keyword=sql",
                "http://localhost",
            ),
        );

        assert.equal(handled, true);
        assert.equal(res.statusCode, 200);
        assert.match(
            res.headers["content-type"],
            /^text\/event-stream; charset=utf-8$/,
        );
        assert.match(res.payload, /retry: 1500/);
        assert.match(res.payload, /event: log/);
        assert.match(res.payload, /"level":"error"/);
        assert.doesNotMatch(res.payload, /"level":"info"/);

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

test("logging stream route treats severity as a threshold", async () => {
    const tempRoot = await mkdtemp(path.join(tmpdir(), "cognis-logging-test-"));
    const logPath = path.join(tempRoot, "app.log");
    const previousLogFile = process.env.LOG_FILE;
    process.env.LOG_FILE = logPath;

    try {
        await writeFile(
            logPath,
            [
                JSON.stringify({
                    ts: "2026-05-09T00:00:00.000Z",
                    level: "info",
                    message: "Informational entry",
                }),
                JSON.stringify({
                    ts: "2026-05-09T00:00:01.000Z",
                    level: "warn",
                    message: "Warning entry",
                }),
                JSON.stringify({
                    ts: "2026-05-09T00:00:02.000Z",
                    level: "error",
                    message: "Error entry",
                }),
            ].join("\n") + "\n",
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
            new URL("/api/v1/logging/stream?severity=warn", "http://localhost"),
        );

        assert.equal(handled, true);
        assert.match(res.payload, /Warning entry/);
        assert.match(res.payload, /Error entry/);
        assert.doesNotMatch(res.payload, /Informational entry/);

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

test("logging stream route ignores invalid multi-value severity thresholds", async () => {
    const tempRoot = await mkdtemp(path.join(tmpdir(), "cognis-logging-test-"));
    const logPath = path.join(tempRoot, "app.log");
    const previousLogFile = process.env.LOG_FILE;
    process.env.LOG_FILE = logPath;

    try {
        await writeFile(
            logPath,
            [
                JSON.stringify({
                    ts: "2026-05-09T00:00:00.000Z",
                    level: "info",
                    message: "Informational entry",
                }),
                JSON.stringify({
                    ts: "2026-05-09T00:00:01.000Z",
                    level: "error",
                    message: "Error entry",
                }),
            ].join("\n") + "\n",
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
            new URL(
                "/api/v1/logging/stream?severity=warn,error",
                "http://localhost",
            ),
        );

        assert.equal(handled, true);
        assert.match(res.payload, /Informational entry/);
        assert.match(res.payload, /Error entry/);

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

test("logging stream route is not constrained by LOG_LEVEL", async () => {
    const tempRoot = await mkdtemp(path.join(tmpdir(), "cognis-logging-test-"));
    const logPath = path.join(tempRoot, "app.log");
    const previousLogFile = process.env.LOG_FILE;
    const previousLogLevel = process.env.LOG_LEVEL;
    process.env.LOG_FILE = logPath;
    process.env.LOG_LEVEL = "error";

    try {
        await writeFile(
            logPath,
            [
                JSON.stringify({
                    ts: "2026-05-09T00:00:00.000Z",
                    level: "info",
                    message: "Informational entry",
                }),
                JSON.stringify({
                    ts: "2026-05-09T00:00:01.000Z",
                    level: "error",
                    message: "Error entry",
                }),
            ].join("\n") + "\n",
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
        assert.match(res.payload, /Error entry/);
        assert.match(res.payload, /Informational entry/);

        req.emit("close");
        res.emit("close");
    } finally {
        if (previousLogFile === undefined) {
            delete process.env.LOG_FILE;
        } else {
            process.env.LOG_FILE = previousLogFile;
        }
        if (previousLogLevel === undefined) {
            delete process.env.LOG_LEVEL;
        } else {
            process.env.LOG_LEVEL = previousLogLevel;
        }
        await rm(tempRoot, { recursive: true, force: true });
    }
});

test("logging stream route applies time range filtering", async () => {
    const tempRoot = await mkdtemp(path.join(tmpdir(), "cognis-logging-test-"));
    const logPath = path.join(tempRoot, "app.log");
    const previousLogFile = process.env.LOG_FILE;
    process.env.LOG_FILE = logPath;

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

    try {
        await writeFile(
            logPath,
            [
                JSON.stringify({
                    ts: tenMinutesAgo,
                    level: "error",
                    message: "Older error entry",
                }),
                JSON.stringify({
                    ts: oneMinuteAgo,
                    level: "error",
                    message: "Recent error entry",
                }),
            ].join("\n") + "\n",
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
            new URL("/api/v1/logging/stream?timeRange=5m", "http://localhost"),
        );

        assert.equal(handled, true);
        assert.match(res.payload, /Recent error entry/);
        assert.doesNotMatch(res.payload, /Older error entry/);

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
