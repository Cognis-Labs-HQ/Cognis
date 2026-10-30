import { createSearchMatchResolver } from "./search-util/matching.js";

/** Filter a collection using current-page text and caller-owned criteria. */
export function filterItems(
    items,
    {
        query = "",
        text = (item) => String(item.label ?? item.name ?? ""),
        predicates = [],
    } = {},
) {
    const match = createSearchMatchResolver(query);
    return Array.from(items).filter(
        (item) =>
            (!query || match(text(item))) &&
            predicates.every((test) => test(item)),
    );
}

/** Sort copies; sequence numbers and stable identities disambiguate equal timestamps. */
export function sortItems(items, order) {
    const result = Array.from(items);
    const label = (item) => String(item.label ?? item.name ?? "");
    const identity = (item) => String(item.id ?? "");
    if (order === "az" || order === "za")
        result.sort(
            (left, right) =>
                (label(left).localeCompare(label(right)) ||
                    identity(left).localeCompare(identity(right))) *
                (order === "za" ? -1 : 1),
        );
    if (order === "newest" || order === "oldest") {
        const direction = order === "newest" ? -1 : 1;
        result.sort((left, right) => {
            const leftTime = Date.parse(left.createdAt ?? "");
            const rightTime = Date.parse(right.createdAt ?? "");
            const validLeft = Number.isFinite(leftTime);
            const validRight = Number.isFinite(rightTime);
            if (validLeft !== validRight) return validLeft ? -1 : 1;
            return (
                ((validLeft ? leftTime - rightTime : 0) ||
                    (Number(left.displayId) || 0) -
                        (Number(right.displayId) || 0) ||
                    identity(left).localeCompare(identity(right), undefined, {
                        numeric: true,
                    })) * direction
            );
        });
    }
    return result;
}
