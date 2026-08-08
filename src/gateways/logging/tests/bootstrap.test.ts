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
    assert.equal(
        ctx.uiRegistry.getAdapterStaticDir("logging", "console"),
        path.resolve(process.cwd(), "src", "adapters", "logging", "console"),
    );
    assert.equal(
        ctx.uiRegistry.getAdapterStaticDir("logging", "file"),
        path.resolve(process.cwd(), "src", "adapters", "logging", "file"),
    );
});

test("logging adapter level overrides reconfigure the running logger immediately", async () => {
    const previousConsoleLevel = process.env.LOG_LEVEL;
    const previousFileLevel = process.env.LOG_FILE_LEVEL;
    process.env.LOG_LEVEL = "error";
    process.env.LOG_FILE_LEVEL = "error";

    try {
        const ctx = await makeContext();
        await bootstrap(ctx as any);
        const logger = ctx.capabilities.get<Logger>("logging:logger");
        assert.ok(logger);
        const adapterHandler = ctx.routeRegistry.getHandlers()[1];
        const token = issueAccessToken("admin-test", "admin", 300);

        const fileConfigRequest = new RequestRecorder("GET", token);
        const fileConfigResponse = new ResponseRecorder();
        await adapterHandler(
            fileConfigRequest as any,
            fileConfigResponse as any,
            new URL(
                "/api/v1/gateways/logging/adapters/file/config",
                "http://localhost",
            ),
        );
        const fileConfigPayload = JSON.parse(fileConfigResponse.payload);
        assert.equal(
            fileConfigPayload.schema.find(
                (field: { key: string }) => field.key === "rotateCompress",
            )?.labelKey,
            "adapter.logging.file.rotate_compress",
        );
        assert.equal(
            fileConfigPayload.schema.some(
                (field: { key: string }) => field.key === "path",
            ),
            false,
        );
        assert.equal("path" in fileConfigPayload.envValues, false);

        const catalogRequest = new RequestRecorder("GET", token);
        const catalogResponse = new ResponseRecorder();
        await adapterHandler(
            catalogRequest as any,
            catalogResponse as any,
            new URL("/api/v1/gateways/logging/adapters", "http://localhost"),
        );
        const fileAdapter = JSON.parse(catalogResponse.payload).data.find(
            (adapter: { id: string }) => adapter.id === "file",
        );
        assert.equal(
            fileAdapter.stringsBaseUrl,
            "/static/adapters/logging/file/languages",
        );

        for (const action of ["enable", "disable"]) {
            const toggleRequest = new RequestRecorder("POST", token);
            const toggleResponse = new ResponseRecorder();
            const handled = await adapterHandler(
                toggleRequest as any,
                toggleResponse as any,
                new URL(fileAdapter.controls[action], "http://localhost"),
            );
            assert.equal(handled, true);
            assert.equal(toggleResponse.statusCode, 409);
            assert.equal(
                JSON.parse(toggleResponse.payload).error.code,
                "adapter_locked",
            );
        }

        const updateAdapter = async (
            adapterId: "console" | "file",
            config: Record<string, unknown>,
        ) => {
            const req = new RequestRecorder(
                "PUT",
                token,
                JSON.stringify(config),
            );
            const res = new ResponseRecorder();
            const handled = await adapterHandler(
                req as any,
                res as any,
                new URL(
                    `/api/v1/gateways/logging/adapters/${adapterId}/config`,
                    "http://localhost",
                ),
            );
            assert.equal(handled, true);
            assert.equal(res.statusCode, 200);
        };

        await updateAdapter("console", { level: "debug", format: "json" });
        assert.equal(logger.getConfiguration().consoleLevel, "debug");
        assert.equal(logger.getConfiguration().consoleFormat, "json");
        const consoleWrites: string[] = [];
        const originalStdoutWrite = process.stdout.write.bind(process.stdout);
        process.stdout.write = ((chunk: string | Uint8Array) => {
            consoleWrites.push(String(chunk));
            return true;
        }) as typeof process.stdout.write;
        try {
            await logger.log("debug", "Live console configuration applied.");
        } finally {
            process.stdout.write = originalStdoutWrite;
        }
        assert.equal(
            JSON.parse(consoleWrites.join(""))?.message,
            "Live console configuration applied.",
        );

        const fileConfiguration = logger.getConfiguration();
        await updateAdapter("file", {
            level: "info",
            rotateMaxBytes: fileConfiguration.rotation.maxBytes,
            rotateMaxFiles: fileConfiguration.rotation.maxFiles,
            rotateCompress: fileConfiguration.rotation.compressRotated,
        });
        assert.equal(logger.getConfiguration().fileLevel, "info");

        const invalidRotationRequest = new RequestRecorder(
            "PUT",
            token,
            JSON.stringify({
                level: "info",
                rotateMaxBytes: 0,
                rotateMaxFiles: -1,
                rotateCompress: true,
            }),
        );
        const invalidRotationResponse = new ResponseRecorder();
        await adapterHandler(
            invalidRotationRequest as any,
            invalidRotationResponse as any,
            new URL(
                "/api/v1/gateways/logging/adapters/file/config",
                "http://localhost",
            ),
        );
        assert.equal(invalidRotationResponse.statusCode, 400);
        assert.equal(
            JSON.parse(invalidRotationResponse.payload).error.field,
            "rotateMaxBytes",
        );
    } finally {
        if (previousConsoleLevel === undefined) delete process.env.LOG_LEVEL;
        else process.env.LOG_LEVEL = previousConsoleLevel;
        if (previousFileLevel === undefined) delete process.env.LOG_FILE_LEVEL;
        else process.env.LOG_FILE_LEVEL = previousFileLevel;
    }
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

        const invalidSeverityValues = [
            "warn,error",
            "info,warn,error",
            "debug,error",
            "warn, error",
            ",",
            " , ",
            "warn,",
            "warn,,",
        ];
        for (const invalidSeverityValue of invalidSeverityValues) {
            const req = new RequestRecorder("GET", token);
            const res = new ResponseRecorder();
            const handled = await streamHandler(
                req as any,
                res as any,
                new URL(
                    `/api/v1/logging/stream?severity=${encodeURIComponent(invalidSeverityValue)}`,
                    "http://localhost",
                ),
            );

            assert.equal(handled, true);
            assert.equal(res.statusCode, 200);
            assert.match(res.payload, /Informational entry/);
            assert.match(res.payload, /Error entry/);
            assert.doesNotMatch(res.payload, /event: snapshot_error/);
            req.emit("close");
            res.emit("close");
        }
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

test("logging stream route returns false for non-matching pathname", async () => {
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
        new URL("/api/v1/logging/entries", "http://localhost"),
    );

    assert.equal(handled, false);
    assert.equal(res.statusCode, 0);
});

test("logging stream route returns false for non-GET method", async () => {
    const ctx = await makeContext();
    await bootstrap(ctx as any);

    const handlers = ctx.routeRegistry.getHandlers();
    const streamHandler = handlers[0];
    const token = issueAccessToken("admin-test", "admin", 300);
    const req = new RequestRecorder("POST", token);
    const res = new ResponseRecorder();

    const handled = await streamHandler(
        req as any,
        res as any,
        new URL("/api/v1/logging/stream", "http://localhost"),
    );

    assert.equal(handled, false);
    assert.equal(res.statusCode, 0);
});

test("logging stream route emits snapshot_error when log file does not exist", async () => {
    const tempRoot = await mkdtemp(path.join(tmpdir(), "cognis-logging-test-"));
    const logPath = path.join(tempRoot, "nonexistent.log");
    const previousLogFile = process.env.LOG_FILE;
    process.env.LOG_FILE = logPath;

    try {
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
        assert.equal(res.statusCode, 200);
        assert.match(res.payload, /event: snapshot_error/);
        assert.match(res.payload, /snapshot_unavailable/);

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

test("logging stream route emits reset event when log file shrinks during poll", async () => {
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
                message: "Initial entry before rotation",
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
        assert.match(res.payload, /Initial entry before rotation/);

        await writeFile(logPath, "", "utf8");

        await new Promise((resolve) => setTimeout(resolve, 1700));

        assert.match(res.payload, /event: reset/);
        assert.match(res.payload, /log_rotated/);

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

test("logging stream route applies time range filtering in hours", async () => {
    const tempRoot = await mkdtemp(path.join(tmpdir(), "cognis-logging-test-"));
    const logPath = path.join(tempRoot, "app.log");
    const previousLogFile = process.env.LOG_FILE;
    process.env.LOG_FILE = logPath;

    const threeHoursAgo = new Date(
        Date.now() - 3 * 60 * 60 * 1000,
    ).toISOString();
    const thirtyMinutesAgo = new Date(
        Date.now() - 30 * 60 * 1000,
    ).toISOString();

    try {
        await writeFile(
            logPath,
            [
                JSON.stringify({
                    ts: threeHoursAgo,
                    level: "error",
                    message: "Old hourly entry",
                }),
                JSON.stringify({
                    ts: thirtyMinutesAgo,
                    level: "error",
                    message: "Recent hourly entry",
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
            new URL("/api/v1/logging/stream?timeRange=1h", "http://localhost"),
        );

        assert.equal(handled, true);
        assert.match(res.payload, /Recent hourly entry/);
        assert.doesNotMatch(res.payload, /Old hourly entry/);

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
