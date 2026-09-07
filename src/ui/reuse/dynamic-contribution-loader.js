/**
 * Shared dynamic contribution loaders for UI extension descriptors.
 *
 * Each descriptor must include a `scriptUrl` string. The module is imported and
 * the named factory export is invoked with caller-provided args.
 */

async function loadContributionModule(scriptUrl) {
    const normalizedUrl = String(scriptUrl ?? "").trim();
    if (!normalizedUrl) return null;
    return import(normalizedUrl);
}

export async function loadDynamicContribution(
    descriptor,
    { exportName, buildArgs, onError },
) {
    try {
        const mod = await loadContributionModule(descriptor?.scriptUrl);
        if (!mod) return null;
        const factory = mod?.[exportName];
        if (typeof factory !== "function") return null;
        const args = buildArgs ? await buildArgs(descriptor) : undefined;
        return factory(args);
    } catch (error) {
        onError?.(error, descriptor);
        return null;
    }
}

export async function loadDynamicContributions(
    descriptors,
    { exportName, buildArgs, onError },
) {
    const normalizedDescriptors = Array.isArray(descriptors) ? descriptors : [];
    const loaded = await Promise.all(
        normalizedDescriptors.map((descriptor) =>
            loadDynamicContribution(descriptor, {
                exportName,
                buildArgs,
                onError,
            }),
        ),
    );
    return loaded.filter(Boolean);
}
