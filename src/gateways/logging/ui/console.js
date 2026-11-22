import { log } from "/static/reuse/diagnostics.js";
/** Routes browser console calls through gateway policy without printing directly. */
export function captureConsole(target = console) {
    const originals = new Map();
    const wrappers = new Map();
    for (const method of ["debug", "info", "log", "warn", "error"]) {
        if (typeof target[method] !== "function") continue;
        const original = target[method].bind(target);
        const wrapper = (...args) => {
            const message =
                args.filter((value) => typeof value === "string").join(" ") ||
                "browser_console_event";
            const meta = { component: "browser", operation: "console" };
            for (const value of args) {
                if (value instanceof Error) meta.errorName = value.name;
                else if (
                    value &&
                    typeof value === "object" &&
                    !Array.isArray(value)
                )
                    Object.assign(meta, value);
            }
            void log(method === "log" ? "info" : method, message, meta);
        };
        originals.set(method, original);
        wrappers.set(method, { original: target[method], wrapper });
        target[method] = wrapper;
    }
    return {
        publish({ level, message, meta }) {
            originals.get(level)?.(message, meta);
        },
        dispose() {
            for (const [method, { original, wrapper }] of wrappers)
                if (target[method] === wrapper) target[method] = original;
        },
    };
}
