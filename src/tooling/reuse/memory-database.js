import assert from "node:assert/strict";

export class MemoryDatabase {
    tables = new Map();

    async ensureTable(definition) {
        if (!this.tables.has(definition.name))
            this.tables.set(definition.name, []);
    }

    async executeCommand(command) {
        const rows = this.tables.get(command.table);
        assert.ok(rows, `Undeclared table: ${command.table}`);
        const matches = (row) =>
            (command.where ?? []).every((condition) => {
                const value = row[condition.column];
                switch (condition.operator ?? "=") {
                    case "=":
                        return value === condition.value;
                    case "!=":
                        return value !== condition.value;
                    case "<":
                        return value < condition.value;
                    default:
                        throw new Error(
                            `Unsupported condition: ${condition.operator}`,
                        );
                }
            });
        if (command.option === "SELECT") {
            const selected = rows.filter(matches);
            return {
                rows: (command.limit
                    ? selected.slice(0, command.limit)
                    : selected
                ).map((row) => ({ ...row })),
            };
        }
        if (command.option === "INSERT") {
            const existing =
                command.conflict &&
                rows.find((row) =>
                    command.conflict.target.every(
                        (key) => row[key] === command.values[key],
                    ),
                );
            if (existing) Object.assign(existing, command.conflict.update);
            else rows.push({ ...command.values });
            return { rowCount: 1 };
        }
        const selected = rows.filter(matches);
        if (command.option === "UPDATE") {
            selected.forEach((row) => Object.assign(row, command.set));
        } else if (command.option === "DELETE") {
            this.tables.set(
                command.table,
                rows.filter((row) => !matches(row)),
            );
        } else {
            throw new Error(`Unsupported command: ${command.option}`);
        }
        return { rowCount: selected.length };
    }

    async transaction(callback) {
        return callback(this);
    }
}
