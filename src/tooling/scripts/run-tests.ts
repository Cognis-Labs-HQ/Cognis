import { existsSync, mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { discoverTestFiles } from "../../core/index.js";

const roots = [
    path.resolve(process.cwd(), "src"),
    path.resolve(
        process.env.COGNIS_EXTERNAL_MODULES_ROOT ??
            path.join(process.cwd(), "external-modules"),
    ),
].filter(existsSync);
const testFiles = (
    await Promise.all(roots.map((root) => discoverTestFiles(root)))
).flat();

const tokenDirectory = mkdtempSync(path.join(tmpdir(), "cognis-test-tokens-"));
const cleanup = () => rmSync(tokenDirectory, { recursive: true, force: true });
process.once("exit", cleanup);

try {
    const child = spawn(
        process.execPath,
        [
            "--experimental-vm-modules",
            "--import",
            "tsx",
            "--import",
            new URL("./test-environment.mjs", import.meta.url).href,
            "--test",
            ...testFiles,
        ],
        {
            cwd: process.cwd(),
            stdio: "inherit",
            env: {
                ...process.env,
                NODE_TEST_CONTEXT: undefined,
                COGNIS_ACCESS_TOKEN_STORE_PATH: undefined,
                COGNIS_TEST_TOKEN_DIRECTORY: tokenDirectory,
            },
        },
    );
    const interrupt = () => child.kill("SIGINT");
    const terminate = () => child.kill("SIGTERM");
    process.once("SIGINT", interrupt);
    process.once("SIGTERM", terminate);
    try {
        process.exitCode = await new Promise<number>((resolve, reject) => {
            child.once("error", reject);
            child.once("exit", (code, signal) =>
                resolve(code ?? (signal ? 1 : 0)),
            );
        });
    } finally {
        process.removeListener("SIGINT", interrupt);
        process.removeListener("SIGTERM", terminate);
    }
} finally {
    cleanup();
    process.removeListener("exit", cleanup);
}
