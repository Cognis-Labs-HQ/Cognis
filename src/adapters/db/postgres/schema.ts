import type { StructuredDbTableDef } from "../../../gateways/db/reuse/db-table.js";

const quote = (identifier: string): string =>
    `"${identifier.replaceAll('"', '""')}"`;
const sameKey = (actual: unknown, expected: string[]): boolean =>
    Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((column, index) => column === expected[index]);

export const KEY_CATALOG_QUERY = `SELECT constraints.conname AS constraint_name, metadata.indisprimary AS is_primary, array_agg(attributes.attname::text ORDER BY keys.ordinality) AS columns
FROM pg_index metadata
CROSS JOIN LATERAL unnest(metadata.indkey) WITH ORDINALITY AS keys(attribute_number, ordinality)
JOIN pg_attribute attributes ON attributes.attrelid = metadata.indrelid AND attributes.attnum = keys.attribute_number
LEFT JOIN pg_constraint constraints ON constraints.conindid = metadata.indexrelid AND constraints.conrelid = metadata.indrelid AND constraints.contype IN ('p', 'u')
WHERE metadata.indrelid = to_regclass($1) AND metadata.indisunique AND metadata.indisvalid AND metadata.indisready AND metadata.indexprs IS NULL AND metadata.indpred IS NULL AND keys.ordinality <= metadata.indnkeyatts
GROUP BY metadata.indexrelid, constraints.conname, metadata.indisprimary`;

export function planKeyReconciliation(
    definition: StructuredDbTableDef,
    indexes: Record<string, unknown>[],
): string[] {
    const primary =
        definition.primaryKey ??
        definition.columns
            .filter(({ primaryKey }) => primaryKey)
            .map(({ name }) => name);
    const declaredUnique = [
        ...(definition.uniqueKeys ?? []),
        ...definition.columns
            .filter(({ unique }) => unique)
            .map(({ name }) => [name]),
    ];
    const unique = [
        ...new Map(
            declaredUnique.map((key) => [JSON.stringify([...key].sort()), key]),
        ).values(),
    ];
    let primaryCurrent = false;
    const currentUnique = new Set<number>();
    const changes: string[] = [];
    for (const index of indexes) {
        const columns = index.columns;
        if (
            index.is_primary === true &&
            primary.length &&
            !sameKey(columns, primary)
        ) {
            changes.push(
                `ALTER TABLE ${quote(definition.name)} DROP CONSTRAINT ${quote(String(index.constraint_name))}`,
            );
            continue;
        }
        if (index.is_primary === true && sameKey(columns, primary))
            primaryCurrent = true;
        for (const [position, key] of unique.entries()) {
            if (
                Array.isArray(columns) &&
                columns.length === key.length &&
                key.every((column) => columns.includes(column))
            )
                currentUnique.add(position);
        }
    }
    if (primary.length && !primaryCurrent)
        changes.push(
            `ALTER TABLE ${quote(definition.name)} ADD PRIMARY KEY (${primary.map(quote).join(", ")})`,
        );
    unique.forEach((key, index) => {
        if (!currentUnique.has(index))
            changes.push(
                `ALTER TABLE ${quote(definition.name)} ADD UNIQUE (${key.map(quote).join(", ")})`,
            );
    });
    return changes;
}
