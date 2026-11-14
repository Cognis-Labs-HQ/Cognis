/** Settings list gestures share native and captured-pointer target resolution and cleanup. */
const owners = new WeakMap();

/** @param {object} options Owned list selectors and callbacks. @returns {object} Cancel and dispose operations. */
export function bindListDropzones({
    root,
    zoneSelector,
    rowSelector,
    handleSelector,
    canDrag,
    canDrop,
    onDrop,
    signal,
    draggingClass,
}) {
    const previousOwner = owners.get(root);
    const view = root.ownerDocument.defaultView;
    const lifetime = new view.AbortController();
    let active = null;
    let revision = 0;
    const log = console.error.bind(console);

    function zones() {
        return [...root.querySelectorAll(zoneSelector)];
    }

    function ownedRow(target) {
        const row = target?.closest?.(rowSelector);
        return row &&
            root.contains(row) &&
            zones().includes(row.closest(zoneSelector))
            ? row
            : null;
    }

    function clearMarkers() {
        root.querySelectorAll(
            ".drop-target-before, .drop-target-after",
        ).forEach((row) => {
            row.classList.remove("drop-target-before", "drop-target-after");
        });
    }

    function cancel() {
        revision++;
        const previous = active;
        active = null;
        clearMarkers();
        if (!previous) return;
        previous.row.classList.remove(draggingClass);
        previous.cleanup?.();
        if (previous.handle?.hasPointerCapture(previous.pointerId)) {
            previous.handle.releasePointerCapture(previous.pointerId);
        }
    }

    function live() {
        return (
            active &&
            root.isConnected &&
            root.contains(active.row) &&
            canDrag(active.row)
        );
    }

    function resolve(event, coordinatesOnly = false) {
        if (!live()) return null;
        const available = zones().filter((zone) => canDrop(active.row, zone));
        const direct = coordinatesOnly
            ? null
            : event.target?.closest?.(zoneSelector);
        const zone = available.includes(direct)
            ? direct
            : available.find((candidate) => {
                  const rect = candidate.getBoundingClientRect();
                  return (
                      event.clientX >= rect.left &&
                      event.clientX <= rect.right &&
                      event.clientY >= rect.top &&
                      event.clientY <= rect.bottom
                  );
              });
        if (!zone) return null;
        const directRow = coordinatesOnly ? null : ownedRow(event.target);
        const row =
            directRow && directRow.closest(zoneSelector) === zone
                ? directRow
                : [...zone.querySelectorAll(rowSelector)].find((candidate) => {
                      const rect = candidate.getBoundingClientRect();
                      return (
                          event.clientY >= rect.top &&
                          event.clientY <= rect.bottom
                      );
                  });
        const rect = row?.getBoundingClientRect();
        return {
            zone,
            row: row ?? null,
            after: Boolean(rect && event.clientY > rect.top + rect.height / 2),
        };
    }

    function preview(target) {
        clearMarkers();
        if (!target || target.row === active?.row) return;
        const row =
            target.row ?? target.zone.querySelector("[data-drop-placeholder]");
        row?.classList.add(
            target.after ? "drop-target-after" : "drop-target-before",
        );
    }

    function current(expectedRevision) {
        return (
            revision === expectedRevision &&
            !lifetime.signal.aborted &&
            !signal?.aborted &&
            owners.get(root) === controller &&
            root.isConnected
        );
    }

    function complete(event, coordinatesOnly = false) {
        const gesture = active;
        const source = gesture?.row;
        const sourceParent = source?.parentElement;
        const expectedRevision = revision + 1;
        let target;
        try {
            target = resolve(event, coordinatesOnly);
            if (target) event.preventDefault();
        } finally {
            if (active === gesture) cancel();
        }
        if (
            !source ||
            !target ||
            target.row === source ||
            !current(expectedRevision)
        )
            return;
        const eligible = canDrag(source) && canDrop(source, target.zone);
        if (
            !eligible ||
            !current(expectedRevision) ||
            ownedRow(source) !== source ||
            source.parentElement !== sourceParent ||
            !zones().includes(target.zone) ||
            (target.row &&
                (ownedRow(target.row) !== target.row ||
                    target.row.closest(zoneSelector) !== target.zone))
        )
            return;
        onDrop({ source, ...target });
    }

    function guarded(handler) {
        return (...args) => {
            try {
                return handler(...args);
            } catch (error) {
                cancel();
                log("list_gesture_failed", {
                    component: "ui.settings",
                    operation: "listGesture",
                    errorName: error?.name,
                });
                throw error;
            }
        };
    }

    function onPointerDown(event) {
        if (
            active ||
            event.pointerType === "mouse" ||
            event.button !== 0 ||
            event.isPrimary === false
        )
            return;
        const handle = event.target?.closest?.(handleSelector);
        const row = ownedRow(handle);
        if (!handle || !row || !canDrag(row)) return;
        event.preventDefault();
        const pointerId = event.pointerId;
        const gesture = new view.AbortController();
        revision++;
        active = { row, handle, pointerId, cleanup: () => gesture.abort() };
        row.classList.add(draggingClass);
        const matches = (next) => next.pointerId === pointerId;
        handle.addEventListener(
            "pointermove",
            guarded((next) => {
                if (!matches(next)) return;
                if (!live()) return cancel();
                next.preventDefault();
                preview(resolve(next, true));
            }),
            { signal: gesture.signal },
        );
        handle.addEventListener(
            "pointerup",
            guarded((next) => {
                if (matches(next)) complete(next, true);
            }),
            { signal: gesture.signal },
        );
        for (const type of ["pointercancel", "lostpointercapture"]) {
            handle.addEventListener(
                type,
                (next) => {
                    if (matches(next)) cancel();
                },
                { signal: gesture.signal },
            );
        }
        handle.setPointerCapture(pointerId);
    }

    function onDragStart(event) {
        if (active) {
            event.preventDefault();
            return;
        }
        const row = ownedRow(event.target);
        if (!row || !canDrag(row)) {
            event.preventDefault();
            return;
        }
        revision++;
        active = { row };
        row.classList.add(draggingClass);
        // Firefox requires a payload to begin a native drag; identity stays owner-local.
        event.dataTransfer?.setData("text/plain", row.textContent);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    }

    const listeners = {
        pointerdown: onPointerDown,
        dragstart: onDragStart,
        dragend: cancel,
        dragover(event) {
            if (active?.handle) return;
            const target = resolve(event);
            preview(target);
            if (target) event.preventDefault();
        },
        dragleave(event) {
            if (!root.contains(event.relatedTarget)) clearMarkers();
        },
        drop(event) {
            if (active?.handle) return;
            complete(event);
        },
    };
    for (const [type, listener] of Object.entries(listeners)) {
        root.addEventListener(type, guarded(listener), {
            signal: lifetime.signal,
        });
    }
    for (const type of ["blur", "pagehide"]) {
        view.addEventListener(type, cancel, { signal: lifetime.signal });
    }
    root.ownerDocument.addEventListener(
        "keydown",
        (event) => {
            if (event.key === "Escape") cancel();
        },
        { signal: lifetime.signal },
    );

    function dispose() {
        lifetime.abort();
        cancel();
        observer.disconnect();
        signal?.removeEventListener("abort", dispose);
        if (owners.get(root) === controller) owners.delete(root);
    }

    const observer = new view.MutationObserver(
        guarded(() => {
            if (active && !live()) cancel();
        }),
    );
    observer.observe(root, { childList: true, subtree: true });
    const controller = { cancel, dispose };
    owners.set(root, controller);
    signal?.addEventListener("abort", dispose, { once: true });
    if (signal?.aborted) dispose();
    previousOwner?.dispose();
    return controller;
}
