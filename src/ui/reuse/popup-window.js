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
 * @param {object} options - Popup launch options.
 * @param {string} options.url - Popup URL.
 * @param {string} [options.target] - Popup target window.
 * @param {string} [options.windowFeatures] - Browser window features string.
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
