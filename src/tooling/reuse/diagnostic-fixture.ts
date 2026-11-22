import { registerHooks } from "node:module";

/** Record the public logging port without choosing a native console sink. */
export function createDiagnosticFixture(entries: unknown[][] = []) {
    return {
        entries,
        async log(...entry: unknown[]) {
            entries.push(structuredClone(entry));
            return true;
        },
    };
}

/** Resolve the host's public diagnostic URL when testing real ESM component exports. */
export function registerPublicDiagnosticImport() {
    const hook = registerHooks({
        resolve(specifier, context, nextResolve) {
            if (specifier === "/static/reuse/diagnostics.js")
                return {
                    url: new URL(
                        "../../ui/reuse/diagnostics.js",
                        import.meta.url,
                    ).href,
                    shortCircuit: true,
                };
            return nextResolve(specifier, context);
        },
    });
    return () => hook.deregister();
}
