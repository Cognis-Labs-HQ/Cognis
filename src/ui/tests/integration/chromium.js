import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

export function findChromium() {
    return [
        process.env.COGNIS_TEST_CHROMIUM,
        "chromium",
        "chromium-browser",
        "google-chrome",
    ]
        .filter(Boolean)
        .find(
            (candidate) =>
                spawnSync(candidate, ["--version"], { stdio: "ignore" })
                    .status === 0,
        );
}

export async function launchChromium(executable) {
    const directory = await mkdtemp(join(tmpdir(), "cognis-browser-"));
    const processHandle = spawn(
        executable,
        [
            "--headless=new",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-background-networking",
            "--no-first-run",
            "--remote-debugging-port=0",
            `--user-data-dir=${directory}`,
            "about:blank",
        ],
        { stdio: ["ignore", "ignore", "pipe"] },
    );
    let diagnostics = "";
    let startupError;
    processHandle.stderr.on("data", (chunk) => {
        diagnostics = (diagnostics + chunk).slice(-6000);
    });
    processHandle.on("error", (error) => {
        startupError = error;
    });
    const pending = new Map();
    const events = [];
    let socket;
    let sequence = 0;
    async function close() {
        for (const request of pending.values()) {
            clearTimeout(request.timeout);
            request.reject(
                new Error("Chromium closed before completing its command."),
            );
        }
        pending.clear();
        socket?.close();
        processHandle.kill("SIGKILL");
        await new Promise((resolve) => {
            if (
                !processHandle.pid ||
                processHandle.exitCode !== null ||
                processHandle.signalCode !== null
            )
                resolve();
            else processHandle.once("exit", resolve);
        });
        await rm(directory, { recursive: true, force: true });
    }
    try {
        let port;
        for (let attempt = 0; attempt < 100; attempt++) {
            if (startupError) throw startupError;
            if (
                processHandle.exitCode !== null ||
                processHandle.signalCode !== null
            ) {
                throw new Error(
                    `Chromium exited before startup: ${diagnostics}`,
                );
            }
            try {
                port = Number(
                    (
                        await readFile(
                            join(directory, "DevToolsActivePort"),
                            "utf8",
                        )
                    ).split("\n")[0],
                );
                break;
            } catch (error) {
                if (error.code !== "ENOENT") throw error;
                await delay(50);
            }
        }
        if (!port)
            throw new Error(
                `Chromium did not expose its debugging endpoint: ${diagnostics}`,
            );
        const targets = await (
            await fetch(`http://127.0.0.1:${port}/json/list`)
        ).json();
        socket = new WebSocket(
            targets.find((target) => target.type === "page")
                .webSocketDebuggerUrl,
        );
        await new Promise((resolve, reject) => {
            socket.addEventListener("open", resolve, { once: true });
            socket.addEventListener("error", reject, { once: true });
        });
        socket.addEventListener("message", (event) => {
            const message = JSON.parse(event.data);
            const request = pending.get(message.id);
            if (request) {
                pending.delete(message.id);
                clearTimeout(request.timeout);
                if (message.error)
                    request.reject(new Error(JSON.stringify(message.error)));
                else request.resolve(message.result);
            } else events.push(message);
        });
        function command(method, params = {}) {
            return new Promise((resolve, reject) => {
                const id = ++sequence;
                const timeout = setTimeout(() => {
                    pending.delete(id);
                    reject(new Error(`Chromium command timed out: ${method}`));
                }, 10000);
                pending.set(id, { resolve, reject, timeout });
                socket.send(JSON.stringify({ id, method, params }));
            });
        }
        async function evaluate(expression) {
            const result = await command("Runtime.evaluate", {
                expression,
                awaitPromise: true,
                returnByValue: true,
            });
            if (result.exceptionDetails) {
                throw new Error(
                    result.exceptionDetails.exception?.description ??
                        result.exceptionDetails.text,
                );
            }
            return result.result.value;
        }
        async function resize(width, height) {
            await command("Emulation.setDeviceMetricsOverride", {
                width,
                height,
                deviceScaleFactor: 1,
                mobile: false,
                screenOrientation: {
                    type:
                        width > height ? "landscapePrimary" : "portraitPrimary",
                    angle: width > height ? 90 : 0,
                },
            });
            await delay(180);
        }
        async function waitFor(expression) {
            for (let attempt = 0; attempt < 100; attempt++) {
                if (await evaluate(expression)) return;
                await delay(50);
            }
            throw new Error(
                `Browser condition did not become true: ${expression}`,
            );
        }
        await command("Runtime.enable");
        await command("Page.enable");
        return { command, evaluate, resize, waitFor, close, events };
    } catch (error) {
        await close();
        throw error;
    }
}
