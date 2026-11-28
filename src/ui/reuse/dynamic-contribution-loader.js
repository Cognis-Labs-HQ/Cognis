/**
 * Loads UI contribution modules without triggering page-entry direct mounts.
 *
 * Public exports:
 * - `loadDynamicContribution(descriptor, options)` — loads one contribution and invokes its factory.
 * - `loadDynamicContributions(descriptors, options)` — loads a list and removes unavailable contributions.
 *
 * @example
 * const section = await loadDynamicContribution(descriptor, {
 *   exportName: 'createAdminSection',
 *   buildArgs: () => ({ i18n }),
 *   onError: (error) => log(error),
 * });
 *
 * @param {{ scriptUrl?: string }} descriptor Contribution resource descriptor.
 * @param {{ exportName: string, buildArgs?: (descriptor: object) => Promise<unknown>|unknown, onError?: (error: unknown, descriptor: object) => void }} options Loader options.
 * @returns {Promise<unknown|null>} The factory result, or null when loading fails.
 */

import { loadWithSpaImportGuard } from "./page-entry.js";

async function loadContributionModule(scriptUrl) {
    const normalizedUrl = String(scriptUrl ?? "").trim();
    if (!normalizedUrl) return null;
    return loadWithSpaImportGuard(() => import(normalizedUrl));
}

/**
 * Loads one descriptor and invokes its named factory.
 *
 * @param {{ scriptUrl?: string }} descriptor Contribution resource descriptor.
 * @param {{ exportName: string, buildArgs?: (descriptor: object) => Promise<unknown>|unknown, onError?: (error: unknown, descriptor: object) => void }} options Loader options.
 * @returns {Promise<unknown|null>} The factory result, or null when loading fails.
 */
export async function loadDynamicContribution(
    descriptor,
    { exportName, buildArgs: buildArgumentsList, onError },
) {
    try {
        const moduleExports = await loadContributionModule(
            descriptor?.scriptUrl,
        );
        if (!moduleExports) return null;
        const factory = moduleExports?.[exportName];
        if (typeof factory !== "function") return null;
        const args = buildArgumentsList
            ? await buildArgumentsList(descriptor)
            : undefined;
        return factory(args);
    } catch (error) {
        onError?.(error, descriptor);
        return null;
    }
}

/**
 * Loads multiple descriptors and removes contributions that could not load.
 *
 * @param {Array<{ scriptUrl?: string }>} descriptors Contribution resource descriptors.
 * @param {{ exportName: string, buildArgs?: (descriptor: object) => Promise<unknown>|unknown, onError?: (error: unknown, descriptor: object) => void }} options Loader options.
 * @returns {Promise<unknown[]>} Successfully created contributions.
 */
export async function loadDynamicContributions(
    descriptors,
    { exportName, buildArgs: buildArgumentsList, onError },
) {
    const normalizedDescriptors = Array.isArray(descriptors) ? descriptors : [];
    const loaded = await Promise.all(
        normalizedDescriptors.map((descriptor) =>
            loadDynamicContribution(descriptor, {
                exportName,
                buildArgs: buildArgumentsList,
                onError,
            }),
        ),
    );
    return loaded.filter(Boolean);
}
