import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { Logger, createLogEntry, formatConsoleLog } from "../logger.js";

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
            "/tmp/cognis-logger-test.log",
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
            "/tmp/cognis-logger-filter-test.log",
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
