import { resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolvePath(fileURLToPath(import.meta.url), "../../../../");

export async function resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("/static/")) {
        return nextResolve(specifier, context);
    }

    const relative = specifier.slice("/static/".length);

    if (relative.startsWith("adapters/")) {
        const rest = relative.slice("adapters/".length);
        const parts = rest.split("/");
        if (parts.length >= 3) {
            const gatewayId = parts[0];
            const adapterId = parts[1];
            const filePart = parts.slice(2).join("/");
            const filePath = resolvePath(
                repoRoot,
                "src",
                "adapters",
                gatewayId,
                adapterId,
                "ui",
                filePart,
            );
            return nextResolve(filePath, context);
        }
    }

    if (relative.startsWith("modules/")) {
        const rest = relative.slice("modules/".length);
        const firstSlash = rest.indexOf("/");
        if (firstSlash > 0) {
            const moduleId = rest.slice(0, firstSlash);
            const filePart = rest.slice(firstSlash + 1);
            const filePath = resolvePath(
                repoRoot,
                "src",
                "modules",
                moduleId,
                "ui",
                filePart,
            );
            return nextResolve(filePath, context);
        }
    }

    const filePath = resolvePath(repoRoot, "src", "ui", relative);
    return nextResolve(filePath, context);
}
