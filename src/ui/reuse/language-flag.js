/**
 * Creates consistent SVG flag images for installed UI languages.
 *
 * Public exports:
 * - `createLanguageFlag()` — creates a decorative language flag image.
 * - `getLanguageFlagUrl()` — resolves the canonical flag URL for a locale.
 *
 * @example
 * ```js
 * const flag = createLanguageFlag('de', { className: 'language-flag' });
 * container.append(flag);
 * ```
 *
 * @param {string} languageCode
 * @returns {string}
 */
export function getLanguageFlagUrl(languageCode) {
    const normalizedCode = String(languageCode ?? "")
        .trim()
        .toLowerCase();
    if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(normalizedCode)) return "";
    return `/static/languages/${normalizedCode}/flag.svg`;
}

/**
 * @param {string} languageCode
 * @param {{ className?: string, sourceUrl?: string }} options
 * @returns {HTMLImageElement}
 */
export function createLanguageFlag(
    languageCode,
    { className = "language-flag", sourceUrl } = {},
) {
    const image = document.createElement("img");
    image.className = className;
    image.src = sourceUrl || getLanguageFlagUrl(languageCode);
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    return image;
}
