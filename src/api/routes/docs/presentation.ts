import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import type { BootstrapLog, ModuleManifest } from "@cognis/core";

export interface DocGroupPresentation {
    id: string;
    name: string;
    ui: { stringsBaseUrl: string; stringsRevision: string };
}

function presentationRevision(manifest: ModuleManifest): string | undefined {
    const files = manifest.files ?? [];
    if (!Array.isArray(files) || manifest.files === null) return undefined;
    const locales = new Map<string, string>();
    for (const file of files) {
        if (
            !file ||
            typeof file !== "object" ||
            Array.isArray(file) ||
            typeof file.path !== "string"
        )
            return undefined;
        const path = file.path.replaceAll("\\", "/").replace(/^\.\//, "");
        if (!/\/[a-z]{2}(?:-[a-z]{2})?\/strings\.xml$/i.test(path)) continue;
        if (
            typeof file.sha256 !== "string" ||
            !/^[a-f0-9]{64}$/i.test(file.sha256) ||
            !path
                .split("/")
                .every((part) => part && part !== "." && part !== "..")
        )
            return undefined;
        if (locales.has(path)) return undefined;
        locales.set(path, file.sha256.toLowerCase());
    }
    return createHash("sha256")
        .update(
            JSON.stringify([
                manifest.version,
                [...locales].sort(([left], [right]) =>
                    left.localeCompare(right),
                ),
            ]),
        )
        .digest("hex");
}

export async function readGroupPresentation(
    sourceRoots: string[],
    group: string,
    log: BootstrapLog = (level, message, metadata) =>
        console.error(`[${level}] ${message}`, metadata),
): Promise<DocGroupPresentation | undefined> {
    if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            group,
        )
    )
        return undefined;
    const unavailable = (reason: string): void =>
        log("error", "Documentation presentation metadata unavailable.", {
            component: "api-docs",
            operation: "readGroupPresentation",
            group,
            reason,
        });
    for (const root of sourceRoots) {
        let manifest: ModuleManifest;
        try {
            const rootPath = await realpath(root);
            const modulePath = await realpath(join(root, group));
            const manifestPath = await realpath(
                join(modulePath, "manifest.json"),
            );
            if (
                relative(rootPath, modulePath) !== group ||
                dirname(manifestPath) !== modulePath
            )
                continue;
            manifest = JSON.parse(await readFile(manifestPath, "utf8"));
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
            if (error instanceof SyntaxError) {
                unavailable("invalid_manifest_json");
                continue;
            }
            throw error;
        }
        if (
            !manifest ||
            typeof manifest !== "object" ||
            Array.isArray(manifest)
        ) {
            unavailable("invalid_manifest_shape");
            continue;
        }
        if (manifest.class !== "extension" || manifest.uuid !== group) continue;
        if (
            typeof manifest.id !== "string" ||
            !/^[a-z0-9][a-z0-9._-]*$/i.test(manifest.id)
        )
            continue;
        if (typeof manifest.name !== "string" || !manifest.name.trim())
            continue;
        if (
            typeof manifest.version !== "string" ||
            !manifest.version.trim() ||
            (manifest.ui !== undefined &&
                (!manifest.ui ||
                    typeof manifest.ui !== "object" ||
                    Array.isArray(manifest.ui)))
        ) {
            unavailable("invalid_locale_descriptor");
            continue;
        }
        const stringsBaseUrl =
            manifest.ui?.stringsBaseUrl ??
            `/static/modules/${manifest.id}/languages`;
        const ownerPrefix = `/static/modules/${manifest.id}/`;
        if (
            typeof stringsBaseUrl !== "string" ||
            !stringsBaseUrl.startsWith(ownerPrefix) ||
            stringsBaseUrl.includes("..") ||
            !stringsBaseUrl
                .slice(ownerPrefix.length)
                .split("/")
                .every((segment) =>
                    /^[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/.test(segment),
                ) ||
            manifest.ui?.stringsBaseUrl === null
        ) {
            unavailable("invalid_locale_url");
            continue;
        }
        const stringsRevision = presentationRevision(manifest);
        if (!stringsRevision) {
            unavailable("invalid_locale_revision");
            continue;
        }
        return {
            id: manifest.id,
            name: manifest.name,
            ui: { stringsBaseUrl, stringsRevision },
        };
    }
    return undefined;
}
