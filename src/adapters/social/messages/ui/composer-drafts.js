export function createMessageDrafts({
    root,
    getInput,
    getSelectedRoomId,
    isActive,
    manager,
}) {
    const revisions = new Map();
    let restoring = false;

    function record() {
        const roomId = getSelectedRoomId();
        if (!isActive() || !roomId) return;
        if (!restoring) revisions.set(roomId, (revisions.get(roomId) ?? 0) + 1);
        manager.savePersistedFormState(
            roomId,
            manager.captureFormState(root, { persistableOnly: true }),
        );
    }

    function restore(room) {
        if (!isActive()) return;
        const roomId = room?.id != null ? String(room.id) : null;
        if (!roomId || roomId !== getSelectedRoomId()) return;
        const persisted = manager.loadPersistedFormState(roomId);
        manager.restoreFormState(root, persisted);
        const input = getInput();
        if (persisted.size === 0 && input) input.value = "";
        restoring = true;
        try {
            input?.dispatchEvent(new Event("input"));
        } finally {
            restoring = false;
        }
    }

    function capture(roomId) {
        return {
            roomId,
            revision: revisions.get(roomId) ?? 0,
            value: getInput()?.value ?? "",
        };
    }

    function consume(snapshot) {
        if (
            !isActive() ||
            (revisions.get(snapshot.roomId) ?? 0) !== snapshot.revision
        )
            return;
        const isSelected = getSelectedRoomId() === snapshot.roomId;
        const input = getInput();
        if (isSelected && (!input || input.value !== snapshot.value)) return;
        manager.clearPersistedFormState(snapshot.roomId);
        if (!isSelected) return;
        input.value = "";
        input.dispatchEvent(new Event("input"));
    }

    return { record, restore, capture, consume };
}
