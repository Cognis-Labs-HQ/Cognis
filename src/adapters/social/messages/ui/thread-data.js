function remotePage(records, before, order) {
    const remote = records
        .filter((message) => !message.queued)
        .sort((left, right) =>
            String(left.createdAt).localeCompare(String(right.createdAt)),
        );
    return {
        remote,
        lower: remote.length === 50 ? remote[0]?.createdAt : null,
        upper: before || null,
        order,
        full: remote.length === 50,
    };
}

function covers(range, message) {
    // A limited page cannot prove absence among omitted rows tied with its
    // oldest timestamp. The existing API's before cursor is also exclusive.
    return (
        (!range.lower || message.createdAt > range.lower) &&
        (!range.upper || message.createdAt < range.upper)
    );
}

function contains(outer, inner) {
    return (
        (!outer.lower || (inner.lower && outer.lower <= inner.lower)) &&
        (!outer.upper || (inner.upper && outer.upper >= inner.upper))
    );
}

function readMetadata(previous, page, live = true) {
    const coverage = previous?.remoteCoverage ?? [];
    const dominated = coverage.some(
        (range) => range.order > page.order && contains(range, page),
    );
    const remoteCoverage =
        !live || dominated
            ? coverage
            : [
                  ...coverage.filter(
                      (range) =>
                          !(page.order >= range.order && contains(page, range)),
                  ),
                  { lower: page.lower, upper: page.upper, order: page.order },
              ];
    return {
        remoteCoverage,
        publicationOrder: Math.max(previous?.publicationOrder ?? 0, page.order),
        queuedProjectionOrder: Math.max(
            previous?.queuedProjectionOrder ?? 0,
            page.order,
        ),
        latestRequestOrder:
            !live || page.upper
                ? (previous?.latestRequestOrder ?? 0)
                : Math.max(previous?.latestRequestOrder ?? 0, page.order),
    };
}

export function confirmThreadRead(view, records, order, live = true) {
    Object.assign(
        view,
        readMetadata(view, remotePage(records, null, order), live),
    );
    if (!live) return;
    const ids = new Set(records.map((message) => message.id));
    for (const message of view.messages) {
        if (ids.has(message.id)) {
            message.renderOrder = Math.max(message.renderOrder ?? 0, order);
            message.readOrder = Math.max(message.readOrder ?? 0, order);
        }
    }
}

export function mergeThreadPage(
    previous,
    decoded,
    { before, refreshOnly = false, requestOrder, live = true } = {},
) {
    const page = remotePage(decoded, before, requestOrder);
    const newer = (previous?.remoteCoverage ?? []).filter(
        (range) => range.order > requestOrder,
    );
    const superseded = newer.some((range) => contains(range, page));
    const known = new Map(
        previous?.messages.map((message) => [message.id, message]),
    );
    let remoteAdjusted = false;
    const retained = (previous?.messages ?? []).filter((message) => {
        if (message.queued) return false;
        if (!live) return true;
        const protectedRow =
            message.renderOrder > requestOrder ||
            newer.some((range) => covers(range, message));
        if (protectedRow && covers(page, message)) remoteAdjusted = true;
        return protectedRow || !covers(page, message);
    });
    const byId = new Map(retained.map((message) => [message.id, message]));
    for (const message of page.remote) {
        if (refreshOnly && !known.has(message.id)) continue;
        if (newer.some((range) => covers(range, message))) {
            remoteAdjusted = true;
            continue;
        }
        const current = known.get(message.id);
        if (!live) {
            // Cached snapshots and subscribers of a pre-existing transport are
            // not new server observations. They can fill an unread prefix but
            // cannot undo known rows, acknowledgements or a live end of history.
            if (current) byId.set(message.id, current);
            else if (
                !previous ||
                ((!previous.historyBoundaryLive || previous.hasMore) &&
                    (!previous.oldestCreatedAt ||
                        message.createdAt <= previous.oldestCreatedAt))
            )
                byId.set(message.id, message);
            continue;
        }
        if (current?.renderOrder > requestOrder) remoteAdjusted = true;
        byId.set(
            message.id,
            current?.renderOrder > requestOrder ? current : message,
        );
    }
    // Queue membership is independent of remote page boundaries and freshness.
    const queuedSource =
        previous?.queuedProjectionOrder > requestOrder
            ? previous.messages
            : decoded;
    for (const message of queuedSource) {
        if (!message.queued || byId.has(message.id)) continue;
        const current = known.get(message.id);
        byId.set(
            message.id,
            current?.renderOrder > requestOrder ? current : message,
        );
    }
    const messages = Array.from(byId.values()).sort((left, right) =>
        String(left.createdAt).localeCompare(String(right.createdAt)),
    );
    const oldest =
        messages.find((message) => !message.queued)?.createdAt ?? null;
    const extendsHistory =
        !previous?.oldestCreatedAt ||
        (oldest && oldest < previous.oldestCreatedAt);
    const ownsHistoryBoundary =
        !before || extendsHistory || before <= previous?.oldestCreatedAt;
    // An acknowledgement can protect a row without proving more server history.
    // Only a newer live observation or rows outside this page retain its boundary.
    const keepBoundary =
        previous &&
        (refreshOnly ||
            superseded ||
            !ownsHistoryBoundary ||
            (live
                ? !before &&
                  previous.historyBoundaryLive &&
                  retained.some(
                      (message) =>
                          !covers(page, message) ||
                          message.readOrder > requestOrder,
                  )
                : !extendsHistory &&
                  !(
                      before &&
                      before <= previous.oldestCreatedAt &&
                      !page.remote.length &&
                      previous.hasMore
                  )));
    return {
        ...readMetadata(previous, page, live),
        messages,
        remoteAdjusted,
        hasMore: keepBoundary
            ? previous.hasMore
            : live
              ? page.full
              : page.remote.length > 0,
        historyBoundaryLive: keepBoundary ? previous.historyBoundaryLive : live,
        oldestCreatedAt: oldest,
        newestCreatedAt:
            before || (!live && previous)
                ? (previous?.newestCreatedAt ?? null)
                : (page.remote.at(-1)?.createdAt ?? null),
        latestIds:
            before || (!live && previous)
                ? (previous?.latestIds ?? [])
                : page.remote.map(({ id }) => id),
    };
}

export function messageRefreshCursor(view, messageId) {
    const target = view?.messages.find(({ id }) => id === messageId);
    if (!target || target.queued || view.latestIds.includes(messageId))
        return null;
    return (
        target.pageBefore ||
        view.messages.find(
            (message) =>
                !message.queued && message.createdAt > target.createdAt,
        )?.createdAt ||
        null
    );
}

export function compactThreadCoverage(ranges, activeOrders) {
    const active = Array.from(activeOrders).sort((left, right) => left - right);
    // Exact publication orders are irrelevant when they compare identically
    // against every active read. Union overlapping ranges within that rank.
    const groups = new Map();
    for (const range of ranges) {
        const rank = active.filter((order) => order < range.order).length;
        if (!rank) continue;
        const group = groups.get(rank) ?? [];
        group.push({ ...range });
        groups.set(rank, group);
    }
    const result = [];
    for (const group of groups.values()) {
        group.sort((left, right) =>
            left.lower === right.lower
                ? 0
                : !left.lower
                  ? -1
                  : !right.lower
                    ? 1
                    : left.lower.localeCompare(right.lower),
        );
        let current;
        for (const range of group) {
            // Both ends are exclusive. Adjacent ranges retain their shared
            // timestamp gap, whose omitted tied rows were never proven absent.
            if (
                current &&
                (!current.upper || !range.lower || range.lower < current.upper)
            ) {
                current.upper =
                    !current.upper || !range.upper
                        ? null
                        : current.upper > range.upper
                          ? current.upper
                          : range.upper;
                current.order = Math.min(current.order, range.order);
            } else {
                current = { ...range };
                result.push(current);
            }
        }
    }
    return result;
}
