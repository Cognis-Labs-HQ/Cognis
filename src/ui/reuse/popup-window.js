/**
 * Popup window launcher helper.
 *
 * Public exports:
 * - openPopupWindow(options) — open a URL in a popup window and report whether
 *   the browser accepted the popup request.
 *
 * Usage:
 *   const opened = openPopupWindow({
 *     url: '/whiteboard?id=abc',
 *     windowFeatures: 'popup,width=1280,height=900,noopener,noreferrer',
 *   });
 *
 * @param {{ url: string, target?: string, windowFeatures?: string }} options - Popup launch options.
 * @returns {boolean} True when the popup window opened, false when blocked or invalid.
 */
export function openPopupWindow({
    url,
    target = "_blank",
    windowFeatures = "popup,width=1280,height=900,noopener,noreferrer",
}) {
    if (typeof url !== "string" || !url.trim()) {
        return false;
    }
    const popupWindow = window.open(url, target, windowFeatures);
    return Boolean(popupWindow);
}
