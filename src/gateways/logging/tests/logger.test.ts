import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import {
    Logger,
    createLogEntry,
    formatConsoleLog,
    writeConsoleLog,
} from "../logger.js";

test("formatConsoleLog renders readable pretty output", () => {
    const entry = createLogEntry("info", "Handled request.", {
        method: "GET",
        details: {
            path: "/api/v1/health",
            durationMs: 12,
        },
    });

    const rendered = formatConsoleLog(entry, "pretty");

    assert.match(rendered, /INFO\s+Handled request\./);
    assert.match(rendered, /method: GET/);
    assert.match(rendered, /details:/);
    assert.match(rendered, /"path": "\/api\/v1\/health"/);
});

test("Logger writes pretty console output and JSON file output", async () => {
    const stdoutWrites: string[] = [];
    const stderrWrites: string[] = [];
    const fileWrites: string[] = [];
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    const originalStderrWrite = process.stderr.write.bind(process.stderr);

    process.stdout.write = ((chunk: string | Uint8Array) => {
        stdoutWrites.push(String(chunk));
        return true;
    }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: string | Uint8Array) => {
        stderrWrites.push(String(chunk));
        return true;
    }) as typeof process.stderr.write;

    try {
        const logger = new Logger(
            "debug",
            path.join(tmpdir(), "cognis-logger-test.log"),
            async (_filePath, content) => {
                fileWrites.push(content);
            },
            "pretty",
        );

        await logger.info("Gateway bootstrapped.", {
            gateway: "logging",
        });
        await logger.error("Gateway failed.", {
            gateway: "logging",
        });
    } finally {
        process.stdout.write = originalStdoutWrite;
        process.stderr.write = originalStderrWrite;
    }

    assert.match(stdoutWrites.join(""), /INFO\s+Gateway bootstrapped\./);
    assert.match(stdoutWrites.join(""), /gateway: logging/);
    assert.match(stderrWrites.join(""), /ERROR\s+Gateway failed\./);
    assert.equal(
        fileWrites[0],
        `${JSON.stringify({
            ts: JSON.parse(fileWrites[0]).ts,
            level: "info",
            message: "Gateway bootstrapped.",
            gateway: "logging",
        })}\n`,
    );
    assert.equal(
        fileWrites[1],
        `${JSON.stringify({
            ts: JSON.parse(fileWrites[1]).ts,
            level: "error",
            message: "Gateway failed.",
            gateway: "logging",
        })}\n`,
    );
});

test("Logger filters console by LOG_LEVEL while persisting all levels to file", async () => {
    const stdoutWrites: string[] = [];
    const stderrWrites: string[] = [];
    const fileWrites: string[] = [];
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    const originalStderrWrite = process.stderr.write.bind(process.stderr);

    process.stdout.write = ((chunk: string | Uint8Array) => {
        stdoutWrites.push(String(chunk));
        return true;
    }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: string | Uint8Array) => {
        stderrWrites.push(String(chunk));
        return true;
    }) as typeof process.stderr.write;

    try {
        const logger = new Logger(
            "warn",
            path.join(tmpdir(), "cognis-logger-filter-test.log"),
            async (_filePath, content) => {
                fileWrites.push(content);
            },
            "pretty",
        );

        await logger.info("User listing completed.", {
            component: "api-users",
        });
        await logger.debug("Background detail.", {
            component: "api-users",
        });
    } finally {
        process.stdout.write = originalStdoutWrite;
        process.stderr.write = originalStderrWrite;
    }

    assert.doesNotMatch(
        stdoutWrites.join(""),
        /INFO\s+User listing completed\./,
    );
    assert.doesNotMatch(stdoutWrites.join(""), /DEBUG\s+Background detail\./);
    assert.equal(stderrWrites.length, 0);
    assert.equal(fileWrites.length, 2);
    const infoEntry = JSON.parse(fileWrites[0]);
    const debugEntry = JSON.parse(fileWrites[1]);
    assert.equal(infoEntry.level, "info");
    assert.equal(infoEntry.message, "User listing completed.");
    assert.equal(debugEntry.level, "debug");
    assert.equal(debugEntry.message, "Background detail.");
});

test("Logger applies independent console and file severity thresholds", async () => {
    const stdoutWrites: string[] = [];
    const fileWrites: string[] = [];
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
        stdoutWrites.push(String(chunk));
        return true;
    }) as typeof process.stdout.write;

    try {
        const logger = new Logger(
            "debug",
            path.join(tmpdir(), "cognis-logger-levels-test.log"),
            async (_filePath, content) => {
                fileWrites.push(content);
            },
            "pretty",
            undefined,
            "error",
        );
        await logger.debug("Console detail only.");
        await logger.error("Console and file error.");
    } finally {
        process.stdout.write = originalStdoutWrite;
    }

    assert.match(stdoutWrites.join(""), /DEBUG\s+Console detail only\./);
    assert.equal(fileWrites.length, 1);
    assert.equal(JSON.parse(fileWrites[0]).level, "error");
});

test("Logger rotates and compresses old log files", async () => {
    const tempRoot = await mkdtemp(path.join(tmpdir(), "cognis-logger-"));
    const logPath = path.join(tempRoot, "app.log");
    try {
        const logger = new Logger("debug", logPath, undefined, "pretty", {
            maxBytes: 1,
            maxFiles: 2,
            compressRotated: true,
        });

        await logger.info("first entry");
        await logger.info("second entry");
        await logger.info("third entry");

        const entries = await readdir(tempRoot);
        const compressed = entries.filter(
            (entry) => entry.startsWith("app.log.") && entry.endsWith(".gz"),
        );
        assert.equal(compressed.length, 2);
        const latestLog = await readFile(logPath, "utf8");
        assert.match(latestLog, /third entry/);
        for (const archiveName of compressed) {
            const archivePath = path.join(tempRoot, archiveName);
            const archiveStats = await stat(archivePath);
            assert.ok(archiveStats.size > 0);
        }
    } finally {
        await rm(tempRoot, { recursive: true, force: true });
    }
});

test("Logger writes to console before queued file writes complete", async () => {
    const stderrWrites: string[] = [];
    const originalStderrWrite = process.stderr.write.bind(process.stderr);
    let releaseQueuedWrite: () => void = () => undefined;
    const queuedWriteRelease = new Promise<void>((resolve) => {
        releaseQueuedWrite = resolve;
    });

    process.stderr.write = ((chunk: string | Uint8Array) => {
        stderrWrites.push(String(chunk));
        return true;
    }) as typeof process.stderr.write;

    try {
        const logger = new Logger(
            "debug",
            path.join(tmpdir(), "cognis-logger-console-order-test.log"),
            async () => {
                await queuedWriteRelease;
            },
            "pretty",
        );
        const pendingLog = logger.error("Console should be immediate.");
        assert.match(stderrWrites.join(""), /Console should be immediate\./);
        releaseQueuedWrite();
        await pendingLog;
    } finally {
        process.stderr.write = originalStderrWrite;
    }
});

test("Logger queue continues processing writes after a failed append", async () => {
    let writeAttemptCount = 0;
    const persistedWrites: string[] = [];
    const logger = new Logger(
        "debug",
        path.join(tmpdir(), "cognis-logger-queue-failure-test.log"),
        async (_filePath, content) => {
            writeAttemptCount += 1;
            if (writeAttemptCount === 1) {
                throw new Error("append failed");
            }
            persistedWrites.push(content);
        },
        "pretty",
    );

    await assert.rejects(
        logger.info("First write should fail."),
        /append failed/,
    );
    await assert.doesNotReject(logger.info("Second write should succeed."));
    assert.equal(persistedWrites.length, 1);
    const secondWrite = JSON.parse(persistedWrites[0]);
    assert.equal(secondWrite.message, "Second write should succeed.");
});

test("formatConsoleLog serializes entry as compact JSON when format is json", () => {
    const entry = createLogEntry("warn", "Database connection lost.", {
        component: "db-gateway",
        attempt: 3,
    });

    const rendered = formatConsoleLog(entry, "json");
    const parsed = JSON.parse(rendered);

    assert.equal(parsed.level, "warn");
    assert.equal(parsed.message, "Database connection lost.");
    assert.equal(parsed.component, "db-gateway");
    assert.equal(parsed.attempt, 3);
    assert.ok(typeof parsed.ts === "string");
});

test("createLogEntry omits meta when no meaningful fields are present", () => {
    const entryWithoutMeta = createLogEntry("info", "Health check passed.");
    assert.equal(entryWithoutMeta.meta, undefined);

    const entryWithEmptyMeta = createLogEntry(
        "info",
        "Health check passed.",
        {},
    );
    assert.equal(entryWithEmptyMeta.meta, undefined);

    const entryWithUndefinedValues = createLogEntry(
        "info",
        "Health check passed.",
        { component: undefined },
    );
    assert.equal(entryWithUndefinedValues.meta, undefined);
});

test("writeConsoleLog writes to stdout for non-error levels and stderr for error level", () => {
    const stdoutWrites: string[] = [];
    const stderrWrites: string[] = [];
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    const originalStderrWrite = process.stderr.write.bind(process.stderr);

    process.stdout.write = ((chunk: string | Uint8Array) => {
        stdoutWrites.push(String(chunk));
        return true;
    }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: string | Uint8Array) => {
        stderrWrites.push(String(chunk));
        return true;
    }) as typeof process.stderr.write;

    try {
        writeConsoleLog("info", "Service started.", { port: 3000 });
        writeConsoleLog("warn", "Deprecated config key detected.");
        writeConsoleLog("error", "Unhandled exception occurred.", {
            fatal: true,
        });
    } finally {
        process.stdout.write = originalStdoutWrite;
        process.stderr.write = originalStderrWrite;
    }

    const stdoutAll = stdoutWrites.join("");
    const stderrAll = stderrWrites.join("");

    assert.match(stdoutAll, /INFO\s+Service started\./);
    assert.match(stdoutAll, /port: 3000/);
    assert.match(stdoutAll, /WARN\s+Deprecated config key detected\./);
    assert.doesNotMatch(stdoutAll, /ERROR/);
    assert.match(stderrAll, /ERROR\s+Unhandled exception occurred\./);
    assert.match(stderrAll, /fatal: true/);
    assert.doesNotMatch(stderrAll, /INFO/);
});
