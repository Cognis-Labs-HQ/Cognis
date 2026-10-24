/**
 * Formats brace-token templates by replacing `{token}` segments with values.
 *
 * Public exports:
 * - formatTemplate(template, values): Returns template text with matching tokens replaced.
 *
 * Usage:
 *   const label = formatTemplate('New Users (Last {days} Days)', { days: 30 });
 *
 * @param {string} template
 * @param {Record<string, string | number | boolean | null | undefined>} values
 * Token keys must use letters, numbers, or underscores only.
 * @returns {string}
 */
export function formatTemplate(template, values) {
    if (typeof template !== "string") return "";
    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
        const replacementValue = values?.[key];
        return replacementValue == null ? match : String(replacementValue);
    });
}
