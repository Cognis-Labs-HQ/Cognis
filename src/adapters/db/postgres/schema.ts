import type { StructuredDbTableDef } from "../../../gateways/db/reuse/db-table.js";

const quote = (identifier: string): string =>
    `"${identifier.replaceAll('"', '""')}"`;
const sameKey = (actual: unknown, expected: string[]): boolean =>
    Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((column, index) => column === expected[index]);

export const KEY_CATALOG_QUERY = `SELECT indexes.relname AS index_name, namespaces.nspname AS schema_name, constraints.conname AS constraint_name, metadata.indisprimary AS is_primary, array_agg(attributes.attname::text ORDER BY keys.ordinality) AS columns
FROM pg_index metadata
JOIN pg_class indexes ON indexes.oid = metadata.indexrelid
JOIN pg_namespace namespaces ON namespaces.oid = indexes.relnamespace
CROSS JOIN LATERAL unnest(metadata.indkey) WITH ORDINALITY AS keys(attribute_number, ordinality)
JOIN pg_attribute attributes ON attributes.attrelid = metadata.indrelid AND attributes.attnum = keys.attribute_number
LEFT JOIN pg_constraint constraints ON constraints.conindid = metadata.indexrelid
WHERE metadata.indrelid = to_regclass($1) AND metadata.indisunique AND metadata.indexprs IS NULL AND metadata.indpred IS NULL AND keys.ordinality <= metadata.indnkeyatts
GROUP BY indexes.relname, namespaces.nspname, constraints.conname, metadata.indisprimary`;

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
        ...new Map(declaredUnique.map((key) => [key.join("\0"), key])).values(),
    ];
    let primaryCurrent = false;
    const currentUnique = new Set<number>();
    const changes: string[] = [];
    for (const index of indexes) {
        if (index.is_primary === true && sameKey(index.columns, primary)) {
            primaryCurrent = true;
            continue;
        }
        const uniqueIndex =
            index.is_primary === true
                ? -1
                : unique.findIndex((key) => sameKey(index.columns, key));
        if (uniqueIndex >= 0 && !currentUnique.has(uniqueIndex)) {
            currentUnique.add(uniqueIndex);
            continue;
        }
        const statement = index.constraint_name
            ? `ALTER TABLE ${quote(definition.name)} DROP CONSTRAINT ${quote(String(index.constraint_name))}`
            : `DROP INDEX ${quote(String(index.schema_name))}.${quote(String(index.index_name))}`;
        changes.push(statement);
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
