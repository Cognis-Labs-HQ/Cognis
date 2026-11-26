import { captureConsole } from "./console.js";
import { normalizeDiagnostic } from "./entry.js";
import { submitBrowserLog } from "./client.js";

export function mountProvider(ctx) {
    let consoleOutput;
    const recentEntries = [];
    ctx.registerFlow("logging:emit", ["validate", "deliver", "publish"]);
    ctx.extendFlow(
        "logging:emit",
        "validate",
        { id: "logging:validate" },
        ({ input, data }) => {
            data.entry = normalizeDiagnostic(input);
            if (!data.entry) return;
            recentEntries.push({
                timestamp: new Date().toISOString(),
                level: data.entry.level,
                message: `${data.entry.message} ${JSON.stringify(data.entry.meta)}`,
            });
            if (recentEntries.length > 30) recentEntries.shift();
        },
    );
    ctx.extendFlow(
        "logging:emit",
        "deliver",
        { id: "logging:deliver" },
        async ({ data }) => {
            if (
                !data.entry ||
                ctx.signal?.aborted ||
                !globalThis.localStorage?.getItem("cognis_access_token")
            )
                return;
            const response = await submitBrowserLog(data.entry, {
                accessToken: globalThis.localStorage.getItem(
                    "cognis_access_token",
                ),
                signal: ctx.signal,
            });
            data.delivered = response.ok;
            data.browserConsole =
                response.ok &&
                response.headers.get("x-cognis-log-console") === "true";
        },
    );
    ctx.extendFlow(
        "logging:emit",
        "publish",
        { id: "logging:publish" },
        ({ data }) => {
            if (!ctx.signal?.aborted && data.browserConsole) {
                consoleOutput.publish(data.entry);
            }
        },
    );
    const log = async (entry) => {
        try {
            const result = await ctx.runFlow("logging:emit", entry);
            return result.data.delivered === true;
        } catch {
            // Logging initialization/delivery cannot recursively log itself.
            return false;
        }
    };
    const worker = globalThis.navigator?.serviceWorker;
    const receiveWorkerLog = (event) => {
        if (
            event.source !== worker?.controller ||
            event.data?.type !== "COGNIS_LOG"
        )
            return;
        void log(event.data.entry);
    };
    const dispose = () => {
        consoleOutput?.dispose();
        worker?.removeEventListener?.("message", receiveWorkerLog);
        ctx.signal?.removeEventListener("abort", dispose);
    };
    ctx.signal?.addEventListener("abort", dispose, { once: true });
    ctx.capabilities.contribute("logging:browser", log);
    ctx.capabilities.contribute("logging:recentEntries", () =>
        recentEntries.map((entry) => ({ ...entry })),
    );
    consoleOutput = captureConsole((level, message, meta) =>
        log({ level, message, meta }),
    );
    ctx.capabilities.contribute(
        "ui:log",
        (level, message, meta = {}, ...details) =>
            log({
                level,
                message,
                meta,
                ...(details.length ? { details } : {}),
            }),
    );
    worker?.addEventListener?.("message", receiveWorkerLog);
    worker?.controller?.postMessage({ type: "COGNIS_FLUSH_LOGS" });
    return dispose;
}
