/**
 * Manages the per-class board entity store (meeting / chat icon positions
 * dragged onto the blackboard by the teacher).
 */
export function createBoardEntityStore() {
    const entityMap = new Map();

    function get(snapshot) {
        const classId = String(snapshot?.id ?? "").trim();
        if (!classId) return [];
        return entityMap.get(classId) ?? [];
    }

    function set(classId, kind, x, y) {
        const normalizedClassId = String(classId ?? "").trim();
        const normalizedKind =
            String(kind ?? "")
                .trim()
                .toLowerCase() === "meeting"
                ? "meeting"
                : "chat";
        if (!normalizedClassId) return;
        const boundedX = Math.min(Math.max(Number(x) || 0, 0), 1);
        const boundedY = Math.min(Math.max(Number(y) || 0, 0), 1);
        const current = entityMap.get(normalizedClassId) ?? [];
        const next = current.filter((entry) => entry.kind !== normalizedKind);
        next.push({ kind: normalizedKind, x: boundedX, y: boundedY });
        entityMap.set(normalizedClassId, next);
    }

    return { get, set };
}
