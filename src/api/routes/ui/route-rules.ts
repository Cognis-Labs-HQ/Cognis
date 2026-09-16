import type { RoleAccessPolicy } from "@cognis/core";
import { parseRoleAccessPolicy } from "../../reuse/parse-role-access-policy.js";
import type { SettingsSection } from "../../reuse/ui-registry.js";

export type SettingsSectionVisibilityCheck = {
    isEnabled?: () => boolean;
    access?: SettingsSection["access"];
};

export interface ModuleUiRouteRule {
    path: string;
    access?: RoleAccessPolicy;
    invalidAccessPolicy?: boolean;
}

export function parseModuleUiRoutes(raw: string): ModuleUiRouteRule[] {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
        .map((entry) => {
            if (typeof entry === "string") {
                return { path: entry } as ModuleUiRouteRule;
            }
            if (
                !entry ||
                typeof entry !== "object" ||
                Array.isArray(entry) ||
                typeof (entry as { path?: unknown }).path !== "string"
            ) {
                return null;
            }
            const parsedAccess = parseRoleAccessPolicy(
                (entry as { access?: unknown }).access,
            );
            return {
                path: (entry as { path: string }).path,
                access: parsedAccess.access,
                invalidAccessPolicy: parsedAccess.invalid,
            } as ModuleUiRouteRule;
        })
        .filter((entry): entry is ModuleUiRouteRule => Boolean(entry));
}
