export function resolveModuleConfigScriptUrl(mod) {
    return String(mod?.ui?.componentConfig?.scriptUrl ?? "").trim();
}
