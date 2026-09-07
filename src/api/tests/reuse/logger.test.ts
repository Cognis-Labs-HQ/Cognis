import assert from "node:assert/strict";
import test from "node:test";
import { createConsoleLog } from "../../reuse/logger.js";

test("console log honors its configured minimum level", () => {
    const writes: string[] = [];
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
        writes.push(String(chunk));
        return true;
    }) as typeof process.stdout.write;

    try {
        const log = createConsoleLog("info");
        log("debug", "Hidden bootstrap detail.");
        log("info", "Visible bootstrap status.");
    } finally {
        process.stdout.write = originalStdoutWrite;
    }

    assert.equal(writes.length, 1);
    assert.match(writes[0], /Visible bootstrap status/);
});
