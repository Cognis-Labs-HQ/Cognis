/**
 * In-tile image viewer with CSS-transform pan and zoom. Teachers can pan and
 * zoom; the viewport is broadcast to students via the classroom layout API so
 * their view tracks the teacher's in real time.
 *
 * Public exports:
 *   - createImageViewer(container, src, options) — mounts the viewer into container.
 *
 * @param {HTMLElement} container Parent element to mount the viewer into.
 * @param {string} src Object URL or data URL for the image.
 * @param {{ isTeacher?: boolean, classId?: string, apiFetch?: Function, signal?: AbortSignal, onViewport?: Function }} options
 * @returns {{ applyViewport(viewport: {scale, x, y}): void, destroy(): void }}
 */
export function createImageViewer(container, src, options = {}) {
    const {
        isTeacher = false,
        classId,
        apiFetch,
        signal,
        onViewport,
    } = options;

    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartOffsetX = 0;
    let dragStartOffsetY = 0;
    let broadcastTimer = null;

    const wrapper = document.createElement("div");
    wrapper.className = "image-viewer-wrap";

    const viewport = document.createElement("div");
    viewport.className = "image-viewer-viewport";

    const img = document.createElement("img");
    img.className = "image-viewer-img";
    img.src = src;
    img.alt = "";
    img.draggable = false;

    viewport.appendChild(img);
    wrapper.appendChild(viewport);
    container.innerHTML = "";
    container.appendChild(wrapper);

    function applyTransform() {
        viewport.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    }

    function clampOffset() {
        const wRect = wrapper.getBoundingClientRect();
        const imgWidth = img.naturalWidth * scale || wRect.width;
        const imgHeight = img.naturalHeight * scale || wRect.height;
        const maxX = Math.max(0, (imgWidth - wRect.width) / 2);
        const maxY = Math.max(0, (imgHeight - wRect.height) / 2);
        offsetX = Math.max(-maxX, Math.min(offsetX, maxX));
        offsetY = Math.max(-maxY, Math.min(offsetY, maxY));
    }

    function scheduleBroadcast() {
        if (!isTeacher || !classId || !apiFetch) return;
        if (broadcastTimer !== null) clearTimeout(broadcastTimer);
        broadcastTimer = setTimeout(() => {
            broadcastTimer = null;
            apiFetch(
                `/api/v1/study/classrooms/${encodeURIComponent(classId)}/layout`,
                {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                        materialViewport: { scale, x: offsetX, y: offsetY },
                    }),
                },
            ).catch(() => {});
            if (typeof onViewport === "function") {
                onViewport({ scale, x: offsetX, y: offsetY });
            }
        }, 80);
    }

    function zoom(deltaScale, pivotX, pivotY) {
        if (!isTeacher) return;
        const wRect = wrapper.getBoundingClientRect();
        const centerX = pivotX - wRect.left - wRect.width / 2;
        const centerY = pivotY - wRect.top - wRect.height / 2;
        const prevScale = scale;
        scale = Math.max(0.1, Math.min(scale * deltaScale, 10));
        const scaleFactor = scale / prevScale;
        offsetX = centerX - (centerX - offsetX) * scaleFactor;
        offsetY = centerY - (centerY - offsetY) * scaleFactor;
        clampOffset();
        applyTransform();
        scheduleBroadcast();
    }

    function handleWheel(event) {
        if (!isTeacher) return;
        event.preventDefault();
        const deltaScale = event.deltaY < 0 ? 1.12 : 1 / 1.12;
        zoom(deltaScale, event.clientX, event.clientY);
    }

    function handlePointerDown(event) {
        if (!isTeacher) return;
        if (event.button !== 0) return;
        isDragging = true;
        dragStartX = event.clientX;
        dragStartY = event.clientY;
        dragStartOffsetX = offsetX;
        dragStartOffsetY = offsetY;
        wrapper.setPointerCapture(event.pointerId);
        wrapper.classList.add("image-viewer-wrap--dragging");
        event.preventDefault();
    }

    function handlePointerMove(event) {
        if (!isDragging) return;
        offsetX = dragStartOffsetX + (event.clientX - dragStartX);
        offsetY = dragStartOffsetY + (event.clientY - dragStartY);
        clampOffset();
        applyTransform();
    }

    function handlePointerUp(event) {
        if (!isDragging) return;
        isDragging = false;
        wrapper.releasePointerCapture(event.pointerId);
        wrapper.classList.remove("image-viewer-wrap--dragging");
        scheduleBroadcast();
    }

    wrapper.addEventListener("wheel", handleWheel, { passive: false });
    wrapper.addEventListener("pointerdown", handlePointerDown);
    wrapper.addEventListener("pointermove", handlePointerMove);
    wrapper.addEventListener("pointerup", handlePointerUp);
    wrapper.addEventListener("pointercancel", handlePointerUp);

    if (signal) {
        signal.addEventListener("abort", () => destroy());
    }

    applyTransform();

    function applyViewport(newViewport) {
        if (!newViewport) return;
        scale = Math.max(0.05, Math.min(Number(newViewport.scale) || 1, 20));
        offsetX = Number(newViewport.x) || 0;
        offsetY = Number(newViewport.y) || 0;
        applyTransform();
    }

    function destroy() {
        if (broadcastTimer !== null) clearTimeout(broadcastTimer);
        wrapper.remove();
    }

    return { applyViewport, destroy };
}
