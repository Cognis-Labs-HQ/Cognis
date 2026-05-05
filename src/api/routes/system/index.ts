import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { HealthService } from "@cognis/core";
import { requireAuth } from "../../auth/guard.js";
import { readJson } from "../read-json.js";
import type { UserPreferenceStore } from "../../../gateways/profile/routes/preferences.js";

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

export function createSystemRoutes(
    healthService: HealthService,
    preferenceStore?: UserPreferenceStore,
) {
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
            const raw = preferenceStore
                ? await preferenceStore.get("__system__", SECURITY_SETTINGS_KEY)
                : null;
            const data = raw ? JSON.parse(raw) : { trustedDomains: [] };
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
            const rawDomains = Array.isArray(body.trustedDomains)
                ? body.trustedDomains
                : [];
            const trustedDomains = rawDomains
                .filter(
                    (d: unknown) =>
                        typeof d === "string" && (d as string).trim(),
                )
                .map((d: string) => d.trim().toLowerCase());
            if (preferenceStore) {
                await preferenceStore.set(
                    "__system__",
                    SECURITY_SETTINGS_KEY,
                    JSON.stringify({ trustedDomains }),
                );
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { saved: true } }));
            return true;
        }

        return false;
    };
}
