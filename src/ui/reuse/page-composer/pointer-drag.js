/** Captures one composer pointer and scrolls visible ancestors while dragging at their edges. */
function scrollAtPointer(target, pointer, elapsed) {
    const document = target.ownerDocument;
    const view = document.defaultView;
    if (
        document
            .elementFromPoint(pointer.clientX, pointer.clientY)
            ?.closest(".composer-panel")
    )
        return false;
    const root = document.scrollingElement;
    let top = 0;
    let bottom = view.innerHeight;
    const ancestors = [];
    for (
        let parent = target.parentElement;
        parent;
        parent = parent.parentElement
    ) {
        if (parent === root) break;
        const overflow = view.getComputedStyle(parent).overflowY;
        if (!/^(auto|scroll|hidden|clip)$/.test(overflow)) continue;
        const bounds = parent.getBoundingClientRect();
        top = Math.max(top, bounds.top);
        bottom = Math.min(bottom, bounds.bottom);
        if (/^(auto|scroll)$/.test(overflow)) ancestors.push(parent);
    }
    if (root) ancestors.push(root);
    const edge = Math.min(64, (bottom - top) / 3);
    if (edge <= 0) return false;
    const direction =
        pointer.clientY < top + edge
            ? -Math.max(
                  0.35,
                  Math.min(1, (top + edge - pointer.clientY) / edge),
              )
            : pointer.clientY > bottom - edge
              ? Math.max(
                    0.35,
                    Math.min(1, (pointer.clientY - bottom + edge) / edge),
                )
              : 0;
    for (const ancestor of ancestors) {
        const previous = ancestor.scrollTop;
        const maximum = ancestor.scrollHeight - ancestor.clientHeight;
        ancestor.scrollTop = Math.max(
            0,
            Math.min(maximum, previous + direction * elapsed * 0.8),
        );
        if (ancestor.scrollTop !== previous) return true;
    }
    return false;
}

/** @param {HTMLElement} target Pointer capture owner. @param {PointerEvent} event Initial press. @param {Function} onMove Grid preview update. @param {Function} onEnd Drop or cancellation. @param {HTMLElement} scrollHost Grid whose ancestors may scroll. @returns {void} */
export function bindComposerPointerDrag(
    target,
    event,
    onMove,
    onEnd,
    scrollHost = target,
) {
    const view = window;
    let pointer = event;
    let moved = false;
    let previousTime;
    let frame;
    let finished = false;
    function finish(completion) {
        if (finished || completion.pointerId !== event.pointerId) return;
        finished = true;
        view.cancelAnimationFrame(frame);
        target.removeEventListener("pointermove", move);
        target.removeEventListener("pointerup", finish);
        target.removeEventListener("pointercancel", finish);
        target.removeEventListener("lostpointercapture", cancel);
        if (target.hasPointerCapture(event.pointerId))
            target.releasePointerCapture(event.pointerId);
        if (
            completion.type === "pointerup" &&
            (completion.clientX !== pointer.clientX ||
                completion.clientY !== pointer.clientY)
        )
            onMove(completion);
        onEnd(completion);
    }
    function cancel(cancellation) {
        if (cancellation && cancellation.pointerId !== event.pointerId) return;
        finish({ type: "pointercancel", pointerId: event.pointerId });
    }
    function move(next) {
        if (next.pointerId !== event.pointerId) return;
        pointer = next;
        moved ||=
            Math.hypot(
                next.clientX - event.clientX,
                next.clientY - event.clientY,
            ) > 4;
        onMove(next);
    }
    function tick(timestamp) {
        if (!target.isConnected || !scrollHost.isConnected) {
            cancel();
            return;
        }
        const elapsed = Math.min(
            32,
            previousTime === undefined ? 16 : timestamp - previousTime,
        );
        previousTime = timestamp;
        if (moved && scrollAtPointer(scrollHost, pointer, elapsed))
            onMove(pointer);
        frame = view.requestAnimationFrame(tick);
    }
    target.setPointerCapture(event.pointerId);
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", finish);
    target.addEventListener("pointercancel", finish);
    target.addEventListener("lostpointercapture", cancel);
    frame = view.requestAnimationFrame(tick);
}
