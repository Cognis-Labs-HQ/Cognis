/**
 * Resolves manifest presentation keys with the declared locale catalog.
 * Public exports:
 * - `localizeModulePresentation` — resolves the manifest's presentation fields.
 *
 * @example
 * await localizeModulePresentation(manifest, i18n);
 *
 * @param {object} module - Manifest presentation and optional catalog metadata.
 * @param {object} baseI18n - Active locale resolver with strict English fallback.
 * @param {Function} extend - Component catalog loader.
 * @returns {Promise<object>} The manifest with localizedPresentation attached.
 */
import { extendI18n } from "./i18n.js";

function resolveManifestString(moduleI18n, value) {
    if (typeof value !== "string") return value;
    return moduleI18n.t(value);
}

export async function localizeModulePresentation(
    module,
    baseI18n,
    extend = extendI18n,
) {
    const presentation = module.catalogPresentation ?? module;
    const stringsBaseUrl = presentation.ui
        ? presentation.ui.stringsBaseUrl
        : module.id
          ? `/static/modules/${module.id}/languages`
          : undefined;
    const moduleI18n = await extend(baseI18n, stringsBaseUrl, {
        revision: presentation.ui?.stringsRevision,
    });
    module.localizedPresentation = {
        name: resolveManifestString(moduleI18n, presentation.name),
        summary: resolveManifestString(moduleI18n, presentation.summary),
        description: resolveManifestString(
            moduleI18n,
            presentation.description,
        ),
        categories: (presentation.categories ?? []).map((value) =>
            resolveManifestString(moduleI18n, value),
        ),
        tags: (presentation.tags ?? []).map((value) =>
            resolveManifestString(moduleI18n, value),
        ),
    };
    return module;
}
