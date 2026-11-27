export function resolveModuleConfigScriptUrl(moduleDescriptor) {
    return String(
        moduleDescriptor?.ui?.componentConfig?.scriptUrl ?? "",
    ).trim();
}
