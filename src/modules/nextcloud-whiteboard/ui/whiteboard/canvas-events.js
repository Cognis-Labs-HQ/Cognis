export function bindWhiteboardCanvasEvents({
    canvasElement,
    onDoubleClick,
    onKeyDown,
    onPaste,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    scheduleRender,
    shouldPreventContextMenu,
    readOnly = false,
}) {
    if (!readOnly) {
        canvasElement.addEventListener("pointerdown", onPointerDown);
        canvasElement.addEventListener("pointermove", onPointerMove);
        canvasElement.addEventListener("pointerup", onPointerUp);
        canvasElement.addEventListener("pointercancel", onPointerUp);
        canvasElement.addEventListener("paste", onPaste);
        document.addEventListener("paste", onPaste);
        canvasElement.addEventListener("keydown", onKeyDown);
        canvasElement.addEventListener("dblclick", onDoubleClick);
    }
    canvasElement.addEventListener("whiteboard:image-loaded", scheduleRender);
    canvasElement.addEventListener("auxclick", preventMiddleClickDefault);
    canvasElement.addEventListener("contextmenu", shouldPreventContextMenu);

    return () => {
        canvasElement.removeEventListener("pointerdown", onPointerDown);
        canvasElement.removeEventListener("pointermove", onPointerMove);
        canvasElement.removeEventListener("pointerup", onPointerUp);
        canvasElement.removeEventListener("pointercancel", onPointerUp);
        canvasElement.removeEventListener("paste", onPaste);
        document.removeEventListener("paste", onPaste);
        canvasElement.removeEventListener("keydown", onKeyDown);
        canvasElement.removeEventListener(
            "whiteboard:image-loaded",
            scheduleRender,
        );
        canvasElement.removeEventListener("dblclick", onDoubleClick);
        canvasElement.removeEventListener(
            "auxclick",
            preventMiddleClickDefault,
        );
        canvasElement.removeEventListener(
            "contextmenu",
            shouldPreventContextMenu,
        );
    };
}

function preventMiddleClickDefault(event) {
    if (event.button === 1) event.preventDefault();
}
