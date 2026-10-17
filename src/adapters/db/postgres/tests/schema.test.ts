import assert from "node:assert/strict";
import test from "node:test";
import { planKeyReconciliation } from "../schema.js";

const definition = {
    name: "records",
    columns: ["owner", "item", "group", "position"].map((name) => ({
        name,
        type: "text" as const,
    })),
    primaryKey: ["owner", "item", "group", "position"],
    uniqueKeys: [["item", "position"]],
};

test("schema reconciliation plans the declared primary and unique keys", () => {
    const changes = planKeyReconciliation(definition, [
        {
            index_name: "records_pkey",
            constraint_name: "records_pkey",
            is_primary: true,
            columns: ["owner", "item"],
        },
        {
            index_name: "records_unique",
            schema_name: "public",
            is_primary: false,
            columns: ["item"],
        },
    ]);
    assert.deepEqual(changes, [
        'ALTER TABLE "records" DROP CONSTRAINT "records_pkey"',
        'DROP INDEX "public"."records_unique"',
        'ALTER TABLE "records" ADD PRIMARY KEY ("owner", "item", "group", "position")',
        'ALTER TABLE "records" ADD UNIQUE ("item", "position")',
    ]);
});

test("matching declared keys require no rewrite", () => {
    assert.deepEqual(
        planKeyReconciliation(definition, [
            { is_primary: true, columns: definition.primaryKey },
            { is_primary: false, columns: definition.uniqueKeys[0] },
        ]),
        [],
    );
});

test("overlapping column and table uniqueness declarations converge on one key", () => {
    const current = {
        name: "accounts",
        columns: [{ name: "email", type: "text" as const, unique: true }],
        uniqueKeys: [["email"]],
    };
    assert.deepEqual(
        planKeyReconciliation(current, [
            { is_primary: false, columns: ["email"] },
        ]),
        [],
    );
    assert.deepEqual(planKeyReconciliation(current, []), [
        'ALTER TABLE "accounts" ADD UNIQUE ("email")',
    ]);
});
