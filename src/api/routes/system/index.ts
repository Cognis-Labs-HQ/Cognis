import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { BootstrapLog, HealthService } from "@cognis/core";
import { readJson } from "../../reuse/read-json.js";
import type { UserPreferenceStore } from "../../reuse/preference-store.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../reuse/route-context.js";
import {
    defaultSecuritySettings,
    normalizeTrustedDomains,
    parseSecuritySettings,
    SECURITY_SETTINGS_KEY,
} from "../../reuse/security-settings.js";

const DEFAULT_DOC_LANGUAGE = "en";
const CHANGELOG_DOCS_DIR = resolve(
    process.cwd(),
    "src",
    "docs",
    "changelog",
);
const API_PACKAGE_JSON_FILE = resolve(
    process.cwd(),
    "src",
    "api",
    "package.json",
);
const RELEASE_NOTES_SUMMARY_MAX_LENGTH = 260;

type ChangelogEntrySummary = {
    slug: string;
    title: string;
    summary: string;
    path: string;
};

let cachedReleaseVersion: string | null = null;

async function listLanguages(log?: BootstrapLog) {
    const root = join(process.cwd(), "src", "ui", "languages");
    const entries = await readdir(root, { withFileTypes: true });
    const languages = [];
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const manifestPath = join(root, entry.name, "manifest.yml");
        try {
            const raw = await readFile(manifestPath, "utf8");
            const data = Object.fromEntries(
                raw
                    .split(/\r?\n/)
                    .filter(Boolean)
                    .map((line) => {
                        const [k, ...rest] = line.split(":");
                        return [k.trim(), rest.join(":").trim()];
                    }),
            );
            if (data.iso_code && data.name)
                languages.push({ ...data, key: entry.name });
        } catch (error) {
            log?.("warn", "Skipped malformed language manifest.", {
                component: "api-system",
                manifestPath,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    return languages;
}

function parseDemoModeFromEnv() {
    const raw = process.env.COGNIS_UI_DEMO_MODE;
    return raw === "1" || raw === "true";
}

function collapseWhitespace(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

function truncateSummary(summary: string): string {
    if (summary.length <= RELEASE_NOTES_SUMMARY_MAX_LENGTH) return summary;
    return `${summary.slice(0, RELEASE_NOTES_SUMMARY_MAX_LENGTH - 1).trimEnd()}…`;
}

function extractChangelogSummary(markdown: string): string {
    const summaryBlockMatch = markdown.match(
        /^##\s+Summary\s*$([\s\S]*?)(?=^##\s+|\Z)/im,
    );
    const candidateBlock = summaryBlockMatch?.[1] ?? markdown;
    const summaryLines = candidateBlock
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .filter((line) => !line.startsWith("#"));
    const summaryText = collapseWhitespace(summaryLines.join(" "));
    return truncateSummary(summaryText);
}

function extractChangelogTitle(markdown: string, fallbackSlug: string): string {
    const headingMatch = markdown.match(/^#\s+(.+)$/m);
    if (headingMatch?.[1]) return headingMatch[1].trim();
    return fallbackSlug
        .split("-")
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ");
}

async function readReleaseVersion(): Promise<string> {
    if (cachedReleaseVersion) return cachedReleaseVersion;
    try {
        const rawPackage = await readFile(API_PACKAGE_JSON_FILE, "utf-8");
        const parsedPackage = JSON.parse(rawPackage);
        const normalizedVersion = String(parsedPackage?.version ?? "").trim();
        cachedReleaseVersion = normalizedVersion || "0.0.0";
    } catch {
        cachedReleaseVersion = "0.0.0";
    }
    return cachedReleaseVersion;
}

async function loadReleaseChangelogEntries(): Promise<ChangelogEntrySummary[]> {
    let changelogFiles;
    try {
        changelogFiles = await readdir(CHANGELOG_DOCS_DIR, {
            withFileTypes: true,
        });
    } catch {
        return [];
    }
    const entryFiles = changelogFiles.filter(
        (entry) =>
            entry.isFile() &&
            entry.name.endsWith(`.${DEFAULT_DOC_LANGUAGE}.md`) &&
            entry.name !== `index.${DEFAULT_DOC_LANGUAGE}.md`,
    );
    const entries = await Promise.all(
        entryFiles.map(async (entry) => {
            const filePath = join(CHANGELOG_DOCS_DIR, entry.name);
            const slug = entry.name.replace(`.${DEFAULT_DOC_LANGUAGE}.md`, "");
            try {
                const [markdown, metadata] = await Promise.all([
                    readFile(filePath, "utf8"),
                    stat(filePath),
                ]);
                return {
                    slug,
                    title: extractChangelogTitle(markdown, slug),
                    summary: extractChangelogSummary(markdown),
                    path: `/changelogs/${slug}`,
                    mtimeMs: metadata.mtimeMs,
                };
            } catch {
                return null;
            }
        }),
    );
    return entries
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .sort((entryA, entryB) => entryB.mtimeMs - entryA.mtimeMs)
        .map(({ mtimeMs: _mtimeMs, ...entry }) => entry);
}

function serializeSecuritySettings(input: {
    trustedDomains: string[];
    registrationsEnabled: boolean;
    userValidationMode: "none" | "smtp";
    requireTeacherManualApproval: boolean;
}): string {
    return JSON.stringify({
        trustedDomains: input.trustedDomains,
        registrationsEnabled: input.registrationsEnabled,
        userValidationMode: input.userValidationMode,
        requireTeacherManualApproval: input.requireTeacherManualApproval,
    });
}

export function createSystemRoutes(
    healthService: HealthService,
    preferenceStore?: UserPreferenceStore,
    log?: BootstrapLog,
    routeContext?: RouteContext,
) {
    const ctx = resolveRouteContext(routeContext);
    const licenseMarkdownFile = resolve(
        process.cwd(),
        "src",
        "ui",
        "public",
        "assets",
        "reuse",
        "license.en.md",
    );
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const logMeta = {
            component: "api-system",
            method: req.method ?? "GET",
            path: url.pathname,
        };
        const isHealthRoute =
            (url.pathname === "/api/v1/system/health" ||
                url.pathname === "/api/v1/system/healthcheck") &&
            req.method === "GET";

        if (isHealthRoute) {
            log?.("debug", "Served health status.", logMeta);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: healthService.status() }));
            return true;
        }

        if (
            url.pathname === "/api/v1/system/languages" &&
            req.method === "GET"
        ) {
            const languages = await listLanguages(log);
            log?.("debug", "Listed UI languages.", {
                ...logMeta,
                count: languages.length,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: languages }));
            return true;
        }

        if (
            url.pathname === "/api/v1/system/ui-config" &&
            req.method === "GET"
        ) {
            log?.("debug", "Served UI config.", {
                ...logMeta,
                demoMode: parseDemoModeFromEnv(),
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({ data: { demoMode: parseDemoModeFromEnv() } }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/system/release-changelog" &&
            req.method === "GET"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const [releaseVersion, entries] = await Promise.all([
                readReleaseVersion(),
                loadReleaseChangelogEntries(),
            ]);
            log?.("debug", "Served release changelog feed.", {
                ...logMeta,
                accountId: claims.sub,
                releaseVersion,
                entryCount: entries.length,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { releaseVersion, entries } }));
            return true;
        }

        if (
            url.pathname === "/api/v1/system/security" &&
            req.method === "GET"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const raw = preferenceStore
                ? await preferenceStore.get("__system__", SECURITY_SETTINGS_KEY)
                : null;
            const data = parseSecuritySettings(raw);
            if (!data && raw) {
                log?.("warn", "Failed to parse persisted security settings.", {
                    ...logMeta,
                    accountId: claims.sub,
                });
            }
            log?.("debug", "Read security settings.", {
                ...logMeta,
                accountId: claims.sub,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: data ?? defaultSecuritySettings(),
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/system/security" &&
            req.method === "PUT"
        ) {
            const claims = ctx.requireAuth(req, res, "admin");
            if (!claims) return true;
            const body = await readJson(req);
            const trustedDomains = normalizeTrustedDomains(body.trustedDomains);
            const registrationsEnabled =
                typeof body.registrationsEnabled === "boolean"
                    ? body.registrationsEnabled
                    : false;
            const userValidationMode =
                body.userValidationMode === "smtp" ? "smtp" : "none";
            const requireTeacherManualApproval =
                body.requireTeacherManualApproval === false ? false : true;
            if (preferenceStore) {
                await preferenceStore.set(
                    "__system__",
                    SECURITY_SETTINGS_KEY,
                    serializeSecuritySettings({
                        trustedDomains,
                        registrationsEnabled,
                        userValidationMode,
                        requireTeacherManualApproval,
                    }),
                );
            }
            log?.("info", "Updated security settings.", {
                ...logMeta,
                accountId: claims.sub,
                trustedDomainCount: trustedDomains.length,
                registrationsEnabled,
                userValidationMode,
                requireTeacherManualApproval,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { saved: true } }));
            return true;
        }

        if (url.pathname === "/api/v1/system/license" && req.method === "GET") {
            let markdown = "";
            try {
                markdown = await readFile(licenseMarkdownFile, "utf8");
            } catch {
                log?.("warn", "License file was not found.", logMeta);
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "License file not found.",
                        },
                    }),
                );
                return true;
            }
            log?.("debug", "Served license markdown.", logMeta);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { markdown } }));
            return true;
        }

        return false;
    };
}
