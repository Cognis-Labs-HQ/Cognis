/**
 * Share-gateway-owned client capability for guest-session awareness and
 * share button creation.
 *
 * Any component that wants to know "am I being viewed as a share guest right
 * now" or wants to render a share button consults this module instead of
 * implementing its own check or its own button markup. This keeps the Share
 * gateway the sole authority over share sessions: if the Share gateway is
 * disabled, this static asset is never served, the dynamic import fails, and
 * dependent components simply render no share button and never treat the
 * visitor as a share guest — share flows are never created in the first
 * place.
 *
 * Public exports:
 *   isViewingAsGuest() — true when the current tab is running an active
 *     share-guest session (a scoped share guest token is active).
 *   mountShareButton(options) — creates and appends a share button into a
 *     container element, unless the current session is a share guest, in
 *     which case it does nothing and returns null.
 *
 * Usage:
 *   let shareButton = null;
 *   try {
 *     const shareButtonModule = await import(
 *       "/static/gateways/share/ui/reuse/share-button.js"
 *     );
 *     shareButton = shareButtonModule.mountShareButton({
 *       container: stageHeader,
 *       label: i18n.t("module.jitsi_meet.share.button"),
 *       onClick: () => openShareLinksPopup(...),
 *       signal,
 *     });
 *   } catch {
 *     // Share gateway unavailable — no share button is rendered.
 *   }
 *
 * @param {{
 *   container: Element,
 *   label: string,
 *   onClick: (event: MouseEvent) => void,
 *   id?: string,
 *   signal?: AbortSignal,
 * }} options
 * @returns {HTMLButtonElement | null}
 */

const GUEST_SESSION_ACTIVE_STORAGE_KEY = "cognis_share_guest_token_active";

/**
 * Returns true when the current browser tab is running an active share-guest
 * session (i.e. a scoped share guest token was swapped into localStorage by
 * the Share gateway's session hook).
 *
 * @returns {boolean}
 */
export function isViewingAsGuest() {
    if (typeof sessionStorage === "undefined") return false;
    const accountId = String(
        globalThis.localStorage?.getItem("cognis_account") ?? "",
    ).trim();
    return (
        sessionStorage.getItem(GUEST_SESSION_ACTIVE_STORAGE_KEY) === "1" ||
        accountId.startsWith("share:")
    );
}

export function mountShareButton({
    container,
    label,
    onClick,
    id = "share-gateway-share-btn",
    className = "btn-confirm btn-animated",
    icon = "🔗",
    title = "",
    signal,
} = {}) {
    if (!(container instanceof Element)) return null;
    if (isViewingAsGuest()) return null;

    const button = document.createElement("button");
    button.id = id;
    button.type = "button";
    button.className = className;
    button.textContent = `${icon ? `${icon} ` : ""}${label ?? ""}`;
    if (title) {
        button.title = title;
        button.setAttribute("aria-label", title);
    }
    if (typeof onClick === "function") {
        button.addEventListener("click", onClick, { signal });
    }
    container.appendChild(button);
    return button;
}

export { GUEST_SESSION_ACTIVE_STORAGE_KEY };
