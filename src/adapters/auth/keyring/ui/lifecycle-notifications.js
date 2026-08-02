export function dispatchKeyringEvent(type, identifier = "") {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
        new CustomEvent("cognis:keyring-event", {
            detail: {
                type: String(type),
                identifier: String(identifier),
            },
        }),
    );
}

export async function showKeyringLifecycleToast(messageKey, variant, loadI18n) {
    if (!/^https?:$/.test(globalThis.location?.protocol ?? "")) return;
    const [{ showToast }, i18n] = await Promise.all([
        import("/static/reuse/toast.js"),
        loadI18n(),
    ]);
    showToast(i18n.t(messageKey), { variant });
}
