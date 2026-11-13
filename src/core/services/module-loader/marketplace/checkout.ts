import { execFile } from "node:child_process";
import { rm } from "node:fs/promises";
import { promisify } from "node:util";
import type { ModuleMarketplaceLog } from "./index.js";
import { commandFailureText } from "../../reuse/command-failure-text.js";

const execFileAsync = promisify(execFile);
const TRANSFER_TIMEOUT_MS = 15 * 60 * 1000;
const RETRY_DELAYS_MS = [250, 1_000];
const TRANSIENT_FAILURE =
    /connection reset|recv failure|could not resolve host|failed to connect|connection timed out|operation timed out|operation too slow|ssl connection timeout|tls connection|tls handshake|gnutls|http\/2 stream|remote end hung up|unexpected disconnect/i;

type GitRunner = (
    file: string,
    args: string[],
    options: { env: NodeJS.ProcessEnv; timeout: number; encoding: "utf8" },
) => Promise<{ stdout: string }>;

interface CheckoutOptions {
    cloneUrl: string;
    commit: string;
    root: string;
    environment: NodeJS.ProcessEnv;
    log: ModuleMarketplaceLog;
}

export async function checkoutModuleRepository(
    options: CheckoutOptions,
    execute: GitRunner = execFileAsync,
): Promise<string> {
    const { cloneUrl, commit, root, environment, log } = options;
    if (!/^[a-f0-9]{7,64}$/i.test(commit)) {
        throw new Error("invalid_module_commit");
    }
    const commandOptions = {
        env: environment,
        timeout: TRANSFER_TIMEOUT_MS,
        encoding: "utf8" as const,
    };
    for (let attempt = 0; ; attempt += 1) {
        await rm(root, { recursive: true, force: true });
        const startedAt = Date.now();
        let stage = "initialize";
        try {
            log("info", "Module repository download started.", {
                component: "module-marketplace",
                operation: "checkoutRepository",
                commit,
                attempt: attempt + 1,
            });
            await execute(
                "git",
                ["init", "--quiet", "--", root],
                commandOptions,
            );
            await execute(
                "git",
                ["-C", root, "remote", "add", "origin", cloneUrl],
                commandOptions,
            );
            stage = "download";
            await execute(
                "git",
                [
                    "-C",
                    root,
                    "-c",
                    "http.version=HTTP/1.1",
                    "-c",
                    "http.lowSpeedLimit=1024",
                    "-c",
                    "http.lowSpeedTime=120",
                    "fetch",
                    "--depth=1",
                    "--no-tags",
                    "--no-recurse-submodules",
                    "--no-progress",
                    "origin",
                    commit,
                ],
                commandOptions,
            );
            stage = "checkout";
            await execute(
                "git",
                ["-C", root, "checkout", "--quiet", "--detach", commit],
                commandOptions,
            );
            const { stdout } = await execute(
                "git",
                ["-C", root, "rev-parse", "HEAD"],
                commandOptions,
            );
            if (stdout.trim() !== commit)
                throw new Error("invalid_module_commit");
            log("info", "Module repository download completed.", {
                component: "module-marketplace",
                operation: "checkoutRepository",
                commit,
                durationMs: Date.now() - startedAt,
            });
            return stdout.trim();
        } catch (error) {
            const output = commandFailureText(error);
            const retry =
                attempt < RETRY_DELAYS_MS.length &&
                TRANSIENT_FAILURE.test(output);
            const timedOut = /timed out|operation too slow/i.test(output);
            const connectionTimeout =
                URL.canParse(cloneUrl) &&
                new URL(cloneUrl).hostname === "github.com" &&
                /ssl connection timeout|tls handshake.*timed out|failed to connect.*timed out/i.test(
                    output,
                );
            if (error instanceof Error && (timedOut || connectionTimeout)) {
                (error as Error & { code?: string }).code = connectionTimeout
                    ? "github_connection_timeout"
                    : "module_install_timeout";
            }
            log(
                retry ? "warn" : "error",
                "Module repository download failed.",
                {
                    component: "module-marketplace",
                    operation: "checkoutRepository",
                    commit,
                    stage,
                    attempt: attempt + 1,
                    durationMs: Date.now() - startedAt,
                    retry,
                    code: (error as { code?: string })?.code,
                },
            );
            if (!retry) throw error;
            await new Promise((resolve) =>
                setTimeout(resolve, RETRY_DELAYS_MS[attempt]),
            );
        }
    }
}
