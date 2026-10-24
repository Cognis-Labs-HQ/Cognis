/** Version only complete asset URLs owned by the registering module. */
export function versionModuleUiAssets<T>(
    descriptor: T,
    moduleId: string,
    revision: string,
): T {
    if (Array.isArray(descriptor)) {
        return descriptor.map((value) =>
            versionModuleUiAssets(value, moduleId, revision),
        ) as T;
    }
    if (descriptor && typeof descriptor === "object") {
        return Object.fromEntries(
            Object.entries(descriptor).map(([key, value]) => [
                key,
                versionModuleUiAssets(value, moduleId, revision),
            ]),
        ) as T;
    }
    if (
        typeof descriptor !== "string" ||
        !descriptor.startsWith(`/static/modules/${moduleId}/`)
    )
        return descriptor;
    const url = new URL(descriptor, "http://localhost");
    if (
        !/\.(?:js|mjs|css|html|xml|json|svg|png|jpe?g|webp)$/.test(url.pathname)
    )
        return descriptor;
    url.searchParams.set("revision", revision);
    return `${url.pathname}${url.search}${url.hash}` as T;
}
