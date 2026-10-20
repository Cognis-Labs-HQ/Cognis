import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export interface ModulePrivilege {
    requested: boolean;
    trustedSource: boolean;
    sourceRepository?: string;
}

export interface ModuleAssurance extends ModulePrivilege {
    moduleId: string;
    moduleUuid: string;
    version?: string;
    integrity: "verified" | "unverified" | "failed";
}

export const PRIVILEGED_FLOW_IDS = new Set([
    "gateAccountCreation",
    "login",
    "startSsoLogin",
]);
const STUDY_LANGUAGE_MODULE_PREFIX = "study-language-";
const LANGUAGE_CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function studyLanguageCode(moduleId: string): string {
    if (!moduleId.startsWith(STUDY_LANGUAGE_MODULE_PREFIX)) return "";
    const languageCode = moduleId.slice(STUDY_LANGUAGE_MODULE_PREFIX.length);
    return LANGUAGE_CODE_PATTERN.test(languageCode) ? languageCode : "";
}
const TRUSTED_PRIVILEGED_GITHUB_OWNER = "cognis-labs-hq";
const RUNTIME_FILE_EXTENSIONS = new Set([
    ".cjs",
    ".js",
    ".json",
    ".jsx",
    ".mjs",
    ".ts",
    ".tsx",
]);

async function listRuntimeFiles(
    root: string,
    directory = root,
): Promise<string[]> {
    const files: string[] = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (entry.name === ".git" || entry.name === "node_modules") continue;
        const candidate = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await listRuntimeFiles(root, candidate)));
            continue;
        }
        const relative = path.relative(root, candidate).replaceAll("\\", "/");
        if (
            relative === "manifest.json" ||
            relative === ".cognis-install.json" ||
            !RUNTIME_FILE_EXTENSIONS.has(path.extname(relative).toLowerCase())
        ) {
            continue;
        }
        files.push(relative);
    }
    return files;
}

export function assertModuleOwnedRoute(
    routePath: string,
    moduleId: string,
    privilege: ModulePrivilege,
): void {
    const ownedPrefix = `/api/v1/modules/${moduleId}`;
    const languageCode = studyLanguageCode(moduleId);
    const languagePrefix = languageCode
        ? `/api/v1/study/languages/${languageCode}`
        : "";
    if (
        !privilege.requested &&
        routePath !== ownedPrefix &&
        !routePath.startsWith(`${ownedPrefix}/`) &&
        (!languagePrefix ||
            (routePath !== languagePrefix &&
                !routePath.startsWith(`${languagePrefix}/`)))
    ) {
        throw new Error("module_privileged_access_required");
    }
}

export function assertModuleOwnedCtxRegistration(
    registrationId: string,
    moduleId: string,
    privilege: ModulePrivilege,
): void {
    const languageCode = studyLanguageCode(moduleId);
    const languageCapability = languageCode
        ? `study:language:${languageCode}`
        : "";
    if (
        !privilege.requested &&
        !registrationId.startsWith(`${moduleId}:`) &&
        (!languageCapability ||
            (registrationId !== languageCapability &&
                !registrationId.startsWith(`${languageCapability}:`)))
    ) {
        throw new Error("module_privileged_access_required");
    }
}

export async function resolveModulePrivilege(
    manifest: { privileged?: boolean },
    moduleRoot: string,
): Promise<ModulePrivilege> {
    if (manifest.privileged !== true) {
        return { requested: false, trustedSource: false };
    }
    const provenance = await readFile(
        path.join(moduleRoot, ".cognis-install.json"),
        "utf8",
    )
        .then((raw) => JSON.parse(raw) as { cloneUrl?: unknown })
        .catch(() => null);
    const sourceRepository = String(provenance?.cloneUrl ?? "").trim();
    let trustedSource = false;
    try {
        const sourceUrl = new URL(sourceRepository);
        trustedSource =
            sourceUrl.protocol === "https:" &&
            sourceUrl.hostname.toLowerCase() === "github.com" &&
            sourceUrl.pathname.split("/").filter(Boolean)[0]?.toLowerCase() ===
                TRUSTED_PRIVILEGED_GITHUB_OWNER;
    } catch {
        trustedSource = false;
    }
    return { requested: true, trustedSource, sourceRepository };
}

export async function resolveModuleAssurance(
    manifest: {
        id: string;
        uuid: string;
        version?: string;
        privileged?: boolean;
        entrypoints?: Record<string, string | undefined>;
        files?: Array<{ path: string; sha256: string }>;
    },
    moduleRoot: string,
): Promise<ModuleAssurance> {
    const privilege = await resolveModulePrivilege(manifest, moduleRoot);
    const provenance = await readFile(
        path.join(moduleRoot, ".cognis-install.json"),
        "utf8",
    )
        .then(
            (raw) =>
                JSON.parse(raw) as {
                    manifestSha256?: unknown;
                },
        )
        .catch(() => null);
    const expectedManifestHash = String(
        provenance?.manifestSha256 ?? "",
    ).toLowerCase();
    if (!expectedManifestHash || !manifest.files?.length) {
        return {
            ...privilege,
            moduleId: manifest.id,
            moduleUuid: manifest.uuid,
            version: manifest.version,
            integrity: "unverified",
        };
    }
    try {
        const declaredFiles = new Set(
            manifest.files.map((file) =>
                file.path.replaceAll("\\", "/").replace(/^\.\//, ""),
            ),
        );
        const missingEntrypoint = Object.values(manifest.entrypoints ?? {})
            .filter((entrypoint): entrypoint is string => Boolean(entrypoint))
            .map((entrypoint) =>
                entrypoint.replaceAll("\\", "/").replace(/^\.\//, ""),
            )
            .find((entrypoint) => !declaredFiles.has(entrypoint));
        if (missingEntrypoint) {
            throw new Error("module_entrypoint_integrity_missing");
        }
        const rawManifest = await readFile(
            path.join(moduleRoot, "manifest.json"),
            "utf8",
        );
        if (
            createHash("sha256").update(rawManifest, "utf8").digest("hex") !==
            expectedManifestHash
        ) {
            throw new Error("module_manifest_checksum_mismatch");
        }
        for (const file of manifest.files) {
            const candidate = path.resolve(moduleRoot, file.path);
            const relative = path.relative(moduleRoot, candidate);
            if (relative.startsWith("..") || path.isAbsolute(relative)) {
                throw new Error("invalid_module_integrity_path");
            }
            const digest = createHash("sha256")
                .update(await readFile(candidate))
                .digest("hex");
            if (digest !== file.sha256.toLowerCase()) {
                throw new Error("module_file_checksum_mismatch");
            }
        }
        const hasUndeclaredRuntimeFile = (
            await listRuntimeFiles(moduleRoot)
        ).some((file) => !declaredFiles.has(file));
        if (hasUndeclaredRuntimeFile) {
            return {
                ...privilege,
                moduleId: manifest.id,
                moduleUuid: manifest.uuid,
                version: manifest.version,
                integrity: "unverified",
            };
        }
        return {
            ...privilege,
            moduleId: manifest.id,
            moduleUuid: manifest.uuid,
            version: manifest.version,
            integrity: "verified",
        };
    } catch {
        return {
            ...privilege,
            moduleId: manifest.id,
            moduleUuid: manifest.uuid,
            version: manifest.version,
            integrity: "failed",
        };
    }
}
