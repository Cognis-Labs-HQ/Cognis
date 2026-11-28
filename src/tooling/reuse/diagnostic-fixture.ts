import { uiCapabilities } from "../../ui/reuse/capabilities.js";
import { registerHooks } from "node:module";

/** Record the public logging port without choosing a native console sink. */
export function createDiagnosticFixture(entries: unknown[][] = []) {
    const log = async (...entry: unknown[]) => {
        entries.push(structuredClone(entry));
        return true;
    };
    return {
        entries,
        log,
        bindCapability(id: string) {
            if (id !== "ui:log")
                throw new Error(`Unexpected capability: ${id}`);
            return log;
        },
    };
}

/** Resolve the host's public diagnostic URL when testing real ESM component exports. */
export function registerPublicDiagnosticImport() {
    const hook = registerHooks({
        resolve(specifier, context, nextResolve) {
            if (specifier === "/static/reuse/capabilities.js")
                return {
                    url: new URL(
                        "../../ui/reuse/capabilities.js",
                        import.meta.url,
                    ).href,
                    shortCircuit: true,
                };
            return nextResolve(specifier, context);
        },
    });
    return () => hook.deregister();
}

/** Contribute a recording public logger for a host consumer test. */
export function subscribeDiagnostics(handler: (entry: object) => unknown) {
    const log = (
        level: unknown,
        message: unknown,
        meta = {},
        ...details: unknown[]
    ) =>
        handler({
            level,
            message,
            meta: meta,
            ...(details.length ? { details } : {}),
        });
    if (!uiCapabilities.contribute("ui:log", log))
        throw new Error("test_logger_already_registered");
    return () => uiCapabilities.remove("ui:log", log);
}
