import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { HealthService } from "@cognis/core";
import { requireAuth } from "../../auth/guard.js";
import { readJson } from "../../reuse/read-json.js";
import type { UserPreferenceStore } from "../../reuse/preference-store.js";

async function listLanguages() {
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
        } catch {}
    }
    return languages;
}

function parseDemoModeFromEnv() {
    const raw = process.env.COGNIS_UI_DEMO_MODE;
    return raw === "1" || raw === "true";
}

const SECURITY_SETTINGS_KEY = "security-settings";

function parseSecuritySettings(raw: string | null): {
    trustedDomains: string[];
    registrationsEnabled: boolean;
} {
    if (!raw) return { trustedDomains: [], registrationsEnabled: true };
    try {
        const parsed = JSON.parse(raw) as { trustedDomains?: unknown };
        const trustedDomains = Array.isArray(parsed.trustedDomains)
            ? parsed.trustedDomains
                  .filter((entry: unknown) => typeof entry === "string")
                  .map((entry: string) => entry.trim().toLowerCase())
                  .filter(Boolean)
            : [];
        const registrationsEnabled =
            typeof (parsed as Record<string, unknown>).registrationsEnabled ===
            "boolean"
                ? Boolean(
                      (parsed as Record<string, unknown>).registrationsEnabled,
                  )
                : true;
        return {
            trustedDomains,
            registrationsEnabled,
        };
    } catch {
        return { trustedDomains: [], registrationsEnabled: true };
    }
}

function serializeSecuritySettings(input: {
    trustedDomains: string[];
    registrationsEnabled: boolean;
}): string {
    return JSON.stringify({
        trustedDomains: input.trustedDomains,
        registrationsEnabled: input.registrationsEnabled,
    });
}

function parseTrustedDomainsInput(rawDomains: unknown): string[] {
    const list = Array.isArray(rawDomains) ? rawDomains : [];
    return list
            .filter((entry: unknown) => typeof entry === "string")
            .map((entry: string) => entry.trim().toLowerCase())
            .filter(Boolean);
}

export function createSystemRoutes(
    healthService: HealthService,
    preferenceStore?: UserPreferenceStore,
) {
    const licenseMarkdownFile = resolve(
        process.cwd(),
        "src",
        "ui",
        "public",
        "assets",
        "reuse",
        "license.md",
    );
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const isHealthRoute =
            (url.pathname === "/api/v1/system/health" ||
                url.pathname === "/api/v1/system/healthcheck") &&
            req.method === "GET";

        if (isHealthRoute) {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: healthService.status() }));
            return true;
        }

        if (
            url.pathname === "/api/v1/system/languages" &&
            req.method === "GET"
        ) {
            const languages = await listLanguages();
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: languages }));
            return true;
        }

        if (
            url.pathname === "/api/v1/system/ui-config" &&
            req.method === "GET"
        ) {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({ data: { demoMode: parseDemoModeFromEnv() } }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/system/security" &&
            req.method === "GET"
        ) {
            if (!requireAuth(req, res, "user")) return true;
            const raw = preferenceStore
                ? await preferenceStore.get("__system__", SECURITY_SETTINGS_KEY)
                : null;
            const data = parseSecuritySettings(raw);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data }));
            return true;
        }

        if (
            url.pathname === "/api/v1/system/security" &&
            req.method === "PUT"
        ) {
            if (!requireAuth(req, res, "admin")) return true;
            const body = await readJson(req);
            const trustedDomains = parseTrustedDomainsInput(body.trustedDomains);
            const registrationsEnabled =
                typeof body.registrationsEnabled === "boolean"
                    ? body.registrationsEnabled
                    : true;
            if (preferenceStore) {
                await preferenceStore.set(
                    "__system__",
                    SECURITY_SETTINGS_KEY,
                    serializeSecuritySettings({
                        trustedDomains,
                        registrationsEnabled,
                    }),
                );
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { saved: true } }));
            return true;
        }

        if (url.pathname === "/api/v1/system/license" && req.method === "GET") {
            let markdown = "";
            try {
                markdown = await readFile(licenseMarkdownFile, "utf8");
            } catch {
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
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { markdown } }));
            return true;
        }

        return false;
    };
}
