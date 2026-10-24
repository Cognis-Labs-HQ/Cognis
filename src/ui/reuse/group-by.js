/**
 * Groups iterable values into a Map without relying on newer Map.groupBy support.
 *
 * Public exports:
 * - `groupByToMap` — groups values by a caller-provided key selector.
 *
 * @example
 * const byKind = groupByToMap(records, (record) => record.kind);
 *
 * @template T, K
 * @param {Iterable<T>} values - Values to group.
 * @param {(value: T, index: number) => K} selectKey - Returns each value's group key.
 * @returns {Map<K, T[]>} Values grouped in insertion order.
 */
export function groupByToMap(values, selectKey) {
    const groups = new Map();
    let index = 0;
    for (const value of values) {
        const key = selectKey(value, index);
        const group = groups.get(key) ?? [];
        group.push(value);
        groups.set(key, group);
        index += 1;
    }
    return groups;
}
