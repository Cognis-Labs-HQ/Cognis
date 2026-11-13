import assert from "node:assert/strict";
import type {
    StructuredDbCommand,
    StructuredDbCommandResult,
} from "../../../gateways/db/reuse/db-command.js";
import type { StructuredDbTableDef } from "../../../gateways/db/reuse/db-table.js";

export class DocumentDatabaseFixture {
    private readonly tables = new Map<string, Array<Record<string, unknown>>>();

    async ensureTable(definition: StructuredDbTableDef): Promise<void> {
        assert.ok(definition.columns.some((column) => column.name === "id"));
        if (!this.tables.has(definition.name))
            this.tables.set(definition.name, []);
    }

    async executeCommand(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult> {
        const rows = this.tables.get(command.table);
        assert.ok(rows, `Table ${command.table} must be initialized`);
        if (command.option === "INSERT") {
            rows.push(structuredClone(command.values));
            return { rowCount: 1 };
        }
        if (command.option === "UPDATE")
            throw new Error("Document versions are immutable");
        const matches = (row: Record<string, unknown>): boolean =>
            (command.where ?? []).every((clause) => {
                assert.ok(!clause.operator || clause.operator === "=");
                return row[clause.column] === clause.value;
            });
        if (command.option === "DELETE") {
            const retained = rows.filter((row) => !matches(row));
            this.tables.set(command.table, retained);
            return { rowCount: rows.length - retained.length };
        }
        const selected = rows.filter(matches);
        for (const order of [...(command.orderBy ?? [])].reverse()) {
            selected.sort((left, right) => {
                const comparison = String(left[order.column]).localeCompare(
                    String(right[order.column]),
                );
                return order.direction === "DESC" ? -comparison : comparison;
            });
        }
        return { rows: structuredClone(selected), rowCount: selected.length };
    }
}
