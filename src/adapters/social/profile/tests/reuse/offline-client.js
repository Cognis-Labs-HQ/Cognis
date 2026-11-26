import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";

export function loadProfileOfflineClient(host) {
    const policy = loadTestModule(
        new URL("../../ui/session-policy.js", import.meta.url),
        {},
        host.globals,
    );
    const own = loadTestModule(
        new URL("../../ui/own-offline.js", import.meta.url),
        { ...host.imports, "./session-policy.js": policy },
        host.globals,
    );
    return loadTestModule(
        new URL("../../ui/offline-client.js", import.meta.url),
        { ...host.imports, "./own-offline.js": own },
        host.globals,
    );
}
