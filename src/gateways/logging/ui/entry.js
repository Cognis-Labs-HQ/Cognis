import { safeMetadata } from "./metadata.js";

import { isLogLevel } from "./reuse/levels.js";

/** Normalize public diagnostics and console-shaped arguments at their gateway. */
export function normalizeDiagnostic(input) {
    if (!input || !isLogLevel(input.level)) return null;
    const values = [input.message, input.meta, ...(input.details ?? [])];
    const messages = values.filter((value) => typeof value === "string");
    const meta = { component: "browser", operation: "diagnostic" };
    for (const value of values) {
        if (value instanceof Error) meta.error = value;
        else if (value && typeof value === "object" && !Array.isArray(value))
            Object.assign(meta, value);
    }
    return {
        level: input.level,
        message: (messages.join(" ").trim() || "browser_diagnostic").slice(
            0,
            2000,
        ),
        meta: safeMetadata(meta) ?? {},
    };
}
