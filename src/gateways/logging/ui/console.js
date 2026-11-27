import { CONSOLE_LEVELS } from "./reuse/levels.js";
/** Routes browser console calls through gateway policy without printing directly. */
export function captureConsole(log, target = console) {
    const originals = new Map();
    const wrappers = new Map();
    for (const [method, level] of Object.entries(CONSOLE_LEVELS)) {
        if (typeof target[method] !== "function") continue;
        const original = target[method].bind(target);
        const wrapper = (...argumentsList) => {
            const message =
                argumentsList
                    .filter((value) => typeof value === "string")
                    .join(" ") || "browser_console_event";
            const metadata = { component: "browser", operation: "console" };
            for (const value of argumentsList) {
                if (value instanceof Error) metadata.errorName = value.name;
                else if (
                    value &&
                    typeof value === "object" &&
                    !Array.isArray(value)
                )
                    Object.assign(metadata, value);
            }
            void log(level, message, metadata);
        };
        originals.set(method, original);
        wrappers.set(method, { original: target[method], wrapper });
        target[method] = wrapper;
    }
    return {
        publish({ level, message, meta: metadata }) {
            originals.get(level)?.(message, metadata);
        },
        dispose() {
            for (const [method, { original, wrapper }] of wrappers)
                if (target[method] === wrapper) target[method] = original;
        },
    };
}
