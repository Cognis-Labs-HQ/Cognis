export function setOverlayVisible(visible, message = "") {
    const overlay = document.getElementById("whiteboard-canvas-overlay");
    if (!overlay) return;
    overlay.hidden = !visible;
    const messageElement = overlay.querySelector(".whiteboard-overlay-message");
    if (messageElement) messageElement.textContent = message;
}
