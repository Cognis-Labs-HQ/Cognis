import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { BootstrapLog, HealthService } from "@cognis/core";
import { readJson } from "../../reuse/read-json.js";
import type { UserPreferenceStore } from "../../reuse/preference-store.js";
import { resolveLangs } from "../../reuse/preferred-languages.js";
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
import {
    loadReleaseChangelogEntries,
    readReleaseVersion,
} from "../../reuse/release-changelog-feed.js";

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

function serializeSecuritySettings(input: {
    trustedDomains: string[];
    registrationsEnabled: boolean;
    userValidationMode: "none" | "smtp";
    requireTeacherManualApproval: boolean;
    enforceTfaForAllUsers: boolean;
}): string {
    return JSON.stringify({
        trustedDomains: input.trustedDomains,
        registrationsEnabled: input.registrationsEnabled,
        userValidationMode: input.userValidationMode,
        requireTeacherManualApproval: input.requireTeacherManualApproval,
        enforceTfaForAllUsers: input.enforceTfaForAllUsers,
    });
}

export function createSystemRoutes(
    healthService: HealthService,
    preferenceStore?: UserPreferenceStore,
    log?: BootstrapLog,
    routeContext?: RouteContext,
    getCapability?: <T>(capabilityId: string) => T | undefined,
) {
    const canSendVerificationEmail = getCapability
        ? getCapability<() => boolean>("notify:canSendVerificationEmail")
        : undefined;
    const getEnforceTfaForAllUsers = getCapability
        ? getCapability<() => Promise<boolean>>("tfa:getEnforceAllUsers")
        : undefined;
    const applyTfaEnforcementPolicy = getCapability
        ? getCapability<
              (input: {
                  required: boolean;
                  excludedSubject?: string;
              }) => Promise<{
                  required: boolean;
                  previousRequired: boolean;
                  revokedSetupPendingCount: number;
              }>
          >("tfa:applyEnforcementPolicy")
        : undefined;
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
            const langs = resolveLangs(url);
            const [releaseVersion, entries] = await Promise.all([
                readReleaseVersion(),
                loadReleaseChangelogEntries(langs),
            ]);
            log?.("debug", "Served release changelog feed.", {
                ...logMeta,
                accountId: claims.sub,
                releaseVersion,
                entryCount: entries.length,
                langs,
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
            const enforceTfaForAllUsers = getEnforceTfaForAllUsers
                ? await getEnforceTfaForAllUsers().catch(() => false)
                : data?.enforceTfaForAllUsers === true;
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
                    data: {
                        ...(data ?? defaultSecuritySettings()),
                        enforceTfaForAllUsers,
                    },
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
            const enforceTfaForAllUsers = body.enforceTfaForAllUsers === true;
            if (
                userValidationMode === "smtp" &&
                canSendVerificationEmail &&
                !canSendVerificationEmail()
            ) {
                log?.(
                    "warn",
                    "Rejected smtp validation mode: SMTP adapter unavailable.",
                    {
                        ...logMeta,
                        accountId: claims.sub,
                    },
                );
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "smtp_unavailable",
                            message:
                                "SMTP adapter is not enabled in the notification gateway.",
                        },
                    }),
                );
                return true;
            }
            if (preferenceStore) {
                await preferenceStore.set(
                    "__system__",
                    SECURITY_SETTINGS_KEY,
                    serializeSecuritySettings({
                        trustedDomains,
                        registrationsEnabled,
                        userValidationMode,
                        requireTeacherManualApproval,
                        enforceTfaForAllUsers,
                    }),
                );
            }
            if (applyTfaEnforcementPolicy) {
                const enforcementResult = await applyTfaEnforcementPolicy({
                    required: enforceTfaForAllUsers,
                    excludedSubject: claims.sub,
                }).catch((error) => {
                    log?.(
                        "warn",
                        "Failed to apply mandatory TFA enforcement policy.",
                        {
                            ...logMeta,
                            accountId: claims.sub,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        },
                    );
                    return null;
                });
                if (
                    enforcementResult?.previousRequired === true &&
                    !enforcementResult.required &&
                    enforcementResult.revokedSetupPendingCount > 0
                ) {
                    log?.(
                        "info",
                        "Revoked setup-pending access tokens after disabling mandatory TFA.",
                        {
                            ...logMeta,
                            accountId: claims.sub,
                            revokedSetupPendingCount:
                                enforcementResult.revokedSetupPendingCount,
                        },
                    );
                }
            }
            log?.("info", "Updated security settings.", {
                ...logMeta,
                accountId: claims.sub,
                trustedDomainCount: trustedDomains.length,
                registrationsEnabled,
                userValidationMode,
                requireTeacherManualApproval,
                enforceTfaForAllUsers,
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
