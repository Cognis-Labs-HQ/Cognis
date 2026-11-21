import { registerHooks } from "node:module";

const mountScope = new URL(
    "../../../../ui/reuse/mount-scope.js",
    import.meta.url,
).href;

registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier === "/static/reuse/mount-scope.js")
            return { url: mountScope, shortCircuit: true };
        return nextResolve(specifier, context);
    },
});
