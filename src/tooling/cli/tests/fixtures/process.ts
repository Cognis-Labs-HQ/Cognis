import {
    spawn,
    spawnSync,
    type ChildProcessWithoutNullStreams,
} from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export const hasPty =
    spawnSync("python3", ["-c", "import pty, termios"]).status === 0;
export const ptyOptions = {
    skip: hasPty ? false : "Python3 with POSIX PTY support is unavailable",
    timeout: 35_000,
};

interface CliRun {
    child: ChildProcessWithoutNullStreams;
    stdout: () => string;
    stderr: () => string;
    send: (input: string) => boolean;
    signal: () => boolean;
    waitFor: (predicate: () => boolean) => Promise<void>;
    outcome: () => Promise<{ code?: number | null; restored?: boolean }>;
    requests: () => Promise<
        Array<{ method: string; path: string; body: unknown }>
    >;
    dispose: () => Promise<void>;
}

export async function launchCli(
    command: string[],
    terminal = true,
    environment: Record<string, string> = {},
): Promise<CliRun> {
    const directory = await mkdtemp(path.join(tmpdir(), "cognis-terminal-"));
    const tokenPath = path.join(directory, "fixture-token");
    const requestLog = path.join(directory, "requests.json");
    await writeFile(tokenPath, "fixture-only");
    await writeFile(requestLog, "[]");
    const executable = [
        process.execPath,
        "--import",
        "tsx",
        "--import",
        "./src/tooling/cli/tests/fixtures/transport.mjs",
        "./src/tooling/cli/index.ts",
        ...command,
    ];
    const child = spawn(
        terminal ? "python3" : executable[0],
        terminal
            ? ["./src/tooling/cli/tests/fixtures/terminal.py", ...executable]
            : executable.slice(1),
        {
            env: {
                ...process.env,
                LC_ALL: "en",
                COGNIS_API_URL: "https://cli-audit.invalid",
                COGNIS_CLI_TOKEN_PATH: tokenPath,
                COGNIS_AUDIT_REQUEST_LOG: requestLog,
                ...environment,
            },
            stdio: ["pipe", "pipe", "pipe"],
        },
    );
    let stdout = "";
    let stderr = "";
    let buffer = "";
    let result: { code?: number; restored?: boolean } = {};
    child.stdout.on("data", (chunk) => {
        if (!terminal) {
            stdout += String(chunk);
            return;
        }
        buffer += String(chunk);
        const lines = buffer.split("\n");
        buffer = lines.pop()!;
        for (const line of lines) {
            const event = JSON.parse(line);
            stdout += event.stdout ?? "";
            stderr += event.stderr ?? "";
            result = { ...result, ...event };
        }
    });
    child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
    });
    const closed = new Promise<number | null>((resolve, reject) => {
        child.once("error", reject);
        child.once("close", resolve);
    });
    return {
        child,
        stdout: () => stdout,
        stderr: () => stderr,
        send: (input: string) =>
            child.stdin.write(JSON.stringify({ input }) + "\n"),
        signal: () =>
            child.stdin.write(JSON.stringify({ signal: "SIGINT" }) + "\n"),
        waitFor: async (predicate: () => boolean) => {
            const deadline = Date.now() + 25_000;
            while (!predicate()) {
                if (child.exitCode !== null || Date.now() > deadline)
                    throw new Error(`CLI output timeout: ${stdout} ${stderr}`);
                await new Promise((resolve) => setTimeout(resolve, 20));
            }
        },
        outcome: async () => {
            const code = await closed;
            return terminal ? result : { code };
        },
        requests: async () =>
            JSON.parse(await readFile(requestLog, "utf8")) as Array<{
                method: string;
                path: string;
                body: unknown;
            }>,
        dispose: async () => {
            if (child.exitCode === null) child.stdin.end();
            await closed;
            await rm(directory, { recursive: true, force: true });
        },
    };
}
