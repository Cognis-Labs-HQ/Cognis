const destinations = new WeakMap();

export function resolveDestination(actionUrl) {
    if (typeof actionUrl !== "string" || !actionUrl.trim()) return null;
    try {
        const url = new URL(actionUrl, window.location.origin);
        return ["http:", "https:"].includes(url.protocol) ? url : null;
    } catch {
        return null;
    }
}

export function allowNavigation(url) {
    return window.dispatchEvent(
        new CustomEvent("cognis:notification-action", {
            cancelable: true,
            detail: { actionUrl: url.href },
        }),
    );
}

export function createPrimaryAction({
    actionUrl,
    subject,
    buttonLabel,
    content,
}) {
    const url = resolveDestination(actionUrl);
    const primary = document.createElement(
        url ? "a" : buttonLabel ? "button" : "span",
    );
    primary.className = "notification-primary";
    primary.innerHTML = content;
    if (url) {
        destinations.set(primary, url);
        primary.href = url.href;
        primary.setAttribute("aria-label", subject);
        if (url.origin !== window.location.origin) {
            primary.target = "_blank";
            primary.rel = "noopener noreferrer";
        }
    } else if (buttonLabel) {
        primary.classList.add("btn-neutral");
        primary.type = "button";
        primary.setAttribute("aria-label", `${buttonLabel}: ${subject}`);
    }
    return primary;
}

export function setControlsDisabled(root, disabled) {
    for (const button of root?.querySelectorAll("button") ?? [])
        button.disabled = disabled;
    for (const link of root?.querySelectorAll("a.notification-primary") ?? []) {
        link.setAttribute("aria-disabled", String(disabled));
        link.tabIndex = disabled ? -1 : 0;
        if (disabled) link.removeAttribute("href");
        else link.href = destinations.get(link).href;
    }
}

export function claimPrimaryActivation(event, primary, isCurrent) {
    if (!isCurrent()) {
        event.preventDefault();
        event.stopPropagation();
        return false;
    }
    if (event.defaultPrevented) return false;
    const url = destinations.get(primary);
    if (
        url &&
        (event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey)
    ) {
        if (
            (event.type === "click" || event.button === 1) &&
            !allowNavigation(url)
        )
            event.preventDefault();
        return false;
    }
    if (event.type !== "click" || event.button !== 0) return false;
    event.preventDefault();
    event.stopPropagation();
    return true;
}
