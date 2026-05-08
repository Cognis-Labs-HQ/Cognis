import test from "node:test";
import assert from "node:assert/strict";
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
