import { createHash } from "node:crypto";
import { textChunks } from "../../../../gateways/reuse/text-chunks.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import type { LibrarySchema } from "../types.js";

function schemaKey(id: string, version: number): string {
    return createHash("sha256")
        .update(JSON.stringify([id, version]))
        .digest("hex");
}

export async function ensureSchemaParts(db: DbExecutor): Promise<void> {
    await db.ensureTable({
        name: "study_library_schema_parts",
        columns: [
            { name: "schema_key", type: "text", notNull: true },
            { name: "position", type: "integer", notNull: true },
            { name: "schema_part", type: "text", notNull: true },
        ],
        primaryKey: ["schema_key", "position"],
    });
}

export async function readSchemaJson(
    db: DbExecutor,
    id: string,
    version: number,
): Promise<string | null> {
    const result = await db.executeCommand({
        option: "SELECT",
        table: "study_library_schemas",
        columns: ["schema_json", { col: "parts.schema_part", as: "part" }],
        joins: [
            {
                type: "LEFT",
                table: "study_library_schema_parts",
                alias: "parts",
                on: {
                    leftColumn: "study_library_schemas.schema_key",
                    rightColumn: "parts.schema_key",
                },
            },
        ],
        where: [
            { column: "schema_id", value: id },
            { column: "version", value: version },
        ],
        orderBy: [{ column: "parts.position", direction: "ASC" }],
    });
    return result.rows?.length
        ? String(result.rows[0].schema_json) +
              result.rows
                  .map((row) => (typeof row.part === "string" ? row.part : ""))
                  .join("")
        : null;
}

/** The caller owns the transaction with schema registration or pack reconciliation. */
export async function writeSchemaJson(
    db: DbExecutor,
    schema: LibrarySchema,
    replace: boolean,
): Promise<void> {
    const key = schemaKey(schema.id, schema.version);
    const parts = textChunks(JSON.stringify(schema), 60_000);
    const values = { schema_key: key, schema_json: parts.next().value! };
    await db.executeCommand(
        replace
            ? {
                  option: "UPDATE",
                  table: "study_library_schemas",
                  set: values,
                  where: [
                      { column: "schema_id", value: schema.id },
                      { column: "version", value: schema.version },
                  ],
              }
            : {
                  option: "INSERT",
                  table: "study_library_schemas",
                  values: {
                      schema_id: schema.id,
                      version: schema.version,
                      ...values,
                  },
              },
    );
    await db.executeCommand({
        option: "DELETE",
        table: "study_library_schema_parts",
        where: [{ column: "schema_key", value: key }],
    });
    let position = 1;
    for (const schemaPart of parts) {
        await db.executeCommand({
            option: "INSERT",
            table: "study_library_schema_parts",
            values: { schema_key: key, position, schema_part: schemaPart },
        });
        position++;
    }
}
