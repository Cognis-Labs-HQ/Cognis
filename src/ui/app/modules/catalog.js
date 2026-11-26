import { loadAuthenticatedModuleAssets } from "./assets.js";
import { localizeModulePresentation } from "./presentation.js";

async function prepareCatalog(modules, i18n, signal) {
    signal?.throwIfAborted();
    await loadAuthenticatedModuleAssets(modules, { signal });
    await Promise.all(
        modules.map((module) => localizeModulePresentation(module, i18n)),
    );
    signal?.throwIfAborted();
    return modules;
}

/** Prepare a complete replacement before exposing catalog keys to renderers. */
export function prepareInstalledCatalog(
    cached,
    installed,
    i18n,
    { signal } = {},
) {
    const modules = cached.map((module) => ({ ...module }));
    for (const installedModule of installed) {
        const known = modules.find(
            (module) => module.uuid === installedModule.uuid,
        );
        if (!known) {
            modules.push({ ...installedModule });
            continue;
        }
        const catalogPresentation = Object.fromEntries(
            [
                "name",
                "summary",
                "description",
                "categories",
                "tags",
                "assets",
            ].map((field) => [field, known[field]]),
        );
        const catalogUi = known.ui;
        Object.assign(known, installedModule, {
            installed: true,
            catalogPresentation: { ...catalogPresentation, ui: catalogUi },
        });
        Object.assign(known, catalogPresentation);
    }
    return prepareCatalog(modules, i18n, signal);
}

/** Discovery must not mutate the published catalog while locale bundles load. */
export function prepareDiscoveredCatalog(
    current,
    discovered,
    i18n,
    { signal } = {},
) {
    const modules = current.map((module) => ({ ...module }));
    for (const incoming of discovered) {
        const known = modules.find((module) => module.uuid === incoming.uuid);
        if (!known) {
            modules.push({ ...incoming });
            continue;
        }
        const status = known.status;
        Object.assign(known, incoming);
        delete known.catalogPresentation;
        if (status) known.status = status;
    }
    return prepareCatalog(modules, i18n, signal);
}
