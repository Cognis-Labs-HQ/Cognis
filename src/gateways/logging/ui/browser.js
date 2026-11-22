import { captureConsole } from "./console.js";
import { safeMetadata } from "./metadata.js";
import { submitBrowserLog } from "./client.js";
import { subscribeDiagnostics } from "/static/reuse/diagnostics.js";

const levels = new Set(["debug", "info", "warn", "error"]);

export function mountProvider(ctx) {
    let consoleOutput;
    ctx.registerFlow("logging:emit", ["validate", "deliver", "publish"]);
    ctx.extendFlow(
        "logging:emit",
        "validate",
        { id: "logging:validate" },
        ({ input, data }) => {
            if (
                !levels.has(input.level) ||
                typeof input.message !== "string" ||
                !input.message.trim()
            )
                return;
            data.entry = {
                level: input.level,
                message: input.message.slice(0, 2000),
                meta: safeMetadata(input.meta) ?? {},
            };
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
    let release;
    const dispose = () => {
        consoleOutput?.dispose();
        release?.();
        worker?.removeEventListener?.("message", receiveWorkerLog);
        ctx.signal?.removeEventListener("abort", dispose);
    };
    ctx.signal?.addEventListener("abort", dispose, { once: true });
    ctx.capabilities.contribute("logging:browser", log);
    release = subscribeDiagnostics(log);
    consoleOutput = captureConsole(console);
    worker?.addEventListener?.("message", receiveWorkerLog);
    worker?.controller?.postMessage({ type: "COGNIS_FLUSH_LOGS" });
    return dispose;
}
