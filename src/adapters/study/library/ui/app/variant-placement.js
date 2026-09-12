/** Variant relationship identity and grid placement for Library cards. */

export function isSameLibraryRecord(left, right) {
    if (!left || !right) return false;
    if (left.id === right.id) return true;
    if (
        left.sourceRecordId &&
        right.sourceRecordId &&
        left.schemaId === right.schemaId &&
        left.layer === right.layer &&
        left.sourceRecordId === right.sourceRecordId
    ) {
        return true;
    }
    return (
        left.schemaId === right.schemaId &&
        left.layer === right.layer &&
        left.language === right.language &&
        left.label.trim().normalize() === right.label.trim().normalize() &&
        JSON.stringify(left.fields ?? {}) === JSON.stringify(right.fields ?? {})
    );
}

export function variantPlacement(entry, schema, entries = []) {
    if (entry.hidden === true) return null;
    const schemas = Array.isArray(schema) ? schema : [schema];
    for (const reference of entry.references ?? []) {
        const relationship = schemas
            .find((candidate) => candidate?.id === entry.schemaId)
            ?.layers.find((layer) => layer.id === entry.layer)
            ?.relationships?.find(
                (candidate) => candidate.id === reference.relation,
            );
        if (relationship?.child === true) {
            const parent = entries.find(
                (candidate) => candidate.id === reference.entryId,
            );
            if (
                !parent ||
                reference.entryId === entry.id ||
                isSameLibraryRecord(entry, parent)
            ) {
                continue;
            }
            return {
                parentId: reference.entryId,
            };
        }
    }
    return null;
}

const VARIANT_DIRECTIONS = [
    "up",
    "down",
    "left",
    "right",
    "up-left",
    "up-right",
    "down-right",
    "down-left",
];

const VARIANT_DIRECTION_OFFSETS = {
    up: { column: 0, row: -1 },
    down: { column: 0, row: 1 },
    left: { column: -1, row: 0 },
    right: { column: 1, row: 0 },
    "up-left": { column: -1, row: -1 },
    "up-right": { column: 1, row: -1 },
    "down-right": { column: 1, row: 1 },
    "down-left": { column: -1, row: 1 },
};

function variantDirectionFitsGrid(
    direction,
    index,
    rowSize,
    itemCount,
    distance = 1,
    origin = { column: 0, row: 0 },
) {
    if (typeof direction !== "string") return false;
    if (!Number.isInteger(index) || !rowSize) return true;
    const offset = VARIANT_DIRECTION_OFFSETS[direction];
    if (!offset) return false;
    const column = index % rowSize;
    const row = Math.floor(index / rowSize);
    const lastRow = Math.ceil(itemCount / rowSize) - 1;
    const targetColumn = column + origin.column + offset.column * distance;
    const targetRow = row + origin.row + offset.row * distance;
    return (
        targetColumn >= 0 &&
        targetColumn < rowSize &&
        targetRow >= 0 &&
        targetRow <= lastRow
    );
}

function variantDirectionCapacity(
    direction,
    index,
    rowSize,
    itemCount,
    origin,
) {
    if (!Number.isInteger(index) || !rowSize) return Number.POSITIVE_INFINITY;
    let capacity = 0;
    while (
        variantDirectionFitsGrid(
            direction,
            index,
            rowSize,
            itemCount,
            capacity + 1,
            origin,
        )
    ) {
        capacity += 1;
    }
    return capacity;
}

function offsetKey(offset) {
    return `${offset.column}:${offset.row}`;
}

export function assignVariantPlacements(entries, schema, layer) {
    const placements = new Map();
    const occupiedByParent = new Map();
    const requests = entries.flatMap((entry) => {
        const placement = variantPlacement(entry, schema, entries);
        return placement ? [{ entry, ...placement }] : [];
    });
    const gridPosition = new Map(
        (layer?.grid?.items ?? []).flatMap((item, index) => {
            if (item === null || typeof item === "object") return [];
            const entry = entries.find(
                (candidate) =>
                    candidate.sourceRecordId === item ||
                    candidate.displayId === item,
            );
            return entry ? [[entry.id, index]] : [];
        }),
    );
    const requestsByEntryId = new Map(
        requests.map((request) => [request.entry.id, request]),
    );
    const childrenByParentId = requests.reduce((children, request) => {
        const siblings = children.get(request.parentId) ?? [];
        siblings.push(request);
        children.set(request.parentId, siblings);
        return children;
    }, new Map());
    const branchDepthFor = (entryId, trail = new Set()) => {
        if (trail.has(entryId)) return 0;
        const children = childrenByParentId.get(entryId) ?? [];
        if (children.length === 0) return 1;
        const nextTrail = new Set(trail).add(entryId);
        return Math.min(
            4,
            1 +
                Math.max(
                    ...children.map(({ entry }) =>
                        branchDepthFor(entry.id, nextTrail),
                    ),
                ),
        );
    };
    const depthFor = (request, trail = new Set()) => {
        if (trail.has(request.entry.id)) return Number.POSITIVE_INFINITY;
        const parentRequest = requestsByEntryId.get(request.parentId);
        if (!parentRequest) return 1;
        return (
            depthFor(parentRequest, new Set(trail).add(request.entry.id)) + 1
        );
    };
    const orderedRequests = requests
        .map((request) => ({ ...request, depth: depthFor(request) }))
        .sort((left, right) => left.depth - right.depth);
    for (const request of orderedRequests) {
        const { depth } = request;
        const parentPlacement = placements.get(request.parentId);
        const index =
            parentPlacement?.rootIndex ?? gridPosition.get(request.parentId);
        const rowSize = layer?.grid?.rowSize;
        const origin = parentPlacement?.offset ?? { column: 0, row: 0 };
        const requiredCapacity = branchDepthFor(request.entry.id);
        const rootId = parentPlacement?.rootId ?? request.parentId;
        const occupiedOffsets = new Set([offsetKey({ column: 0, row: 0 })]);
        let ancestorPlacement = parentPlacement;
        while (ancestorPlacement) {
            occupiedOffsets.add(offsetKey(ancestorPlacement.offset));
            ancestorPlacement = placements.get(ancestorPlacement.parentId);
        }
        const occupied = occupiedByParent.get(request.parentId) ?? new Set();
        const preferred = [
            ...(parentPlacement ? [parentPlacement.direction] : []),
            ...VARIANT_DIRECTIONS,
        ].filter(
            (candidate, candidateIndex, directions) =>
                directions.indexOf(candidate) === candidateIndex,
        );
        const candidateDetails = preferred.flatMap((candidate) => {
            if (occupied.has(candidate)) return [];
            const directionOffset = VARIANT_DIRECTION_OFFSETS[candidate];
            const targetOffset = {
                column: origin.column + directionOffset.column,
                row: origin.row + directionOffset.row,
            };
            if (occupiedOffsets.has(offsetKey(targetOffset))) return [];
            const capacity = variantDirectionCapacity(
                candidate,
                index,
                rowSize,
                layer?.grid?.items?.length ?? entries.length,
                origin,
            );
            return capacity > 0
                ? [{ direction: candidate, capacity, targetOffset }]
                : [];
        });
        const selected =
            candidateDetails.find(
                ({ capacity }) => capacity >= requiredCapacity,
            ) ??
            candidateDetails.reduce(
                (best, candidate) =>
                    !best || candidate.capacity > best.capacity
                        ? candidate
                        : best,
                null,
            );
        if (!selected || !Number.isFinite(depth)) continue;
        const { direction, targetOffset } = selected;
        occupied.add(direction);
        occupiedByParent.set(request.parentId, occupied);
        placements.set(request.entry.id, {
            ...request,
            direction,
            depth,
            rootIndex: index,
            rootId,
            offset: targetOffset,
        });
    }
    return placements;
}
