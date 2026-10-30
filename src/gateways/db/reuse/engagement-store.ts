import type {
    EngagementStore,
    EngagementSnapshot,
    EngagementState,
} from "@cognis/core";
import { textChunks } from "../../reuse/text-chunks.js";
import type { DbExecutor } from "./db-executor.js";

/** Persist participant reward ledgers through the database gateway's public contract. */
export function createEngagementStore(
    resolveDatabase: () => DbExecutor,
): EngagementStore {
    let initialized: Promise<void> | undefined;
    const database = async () => {
        const executor = resolveDatabase();
        initialized ??= (async () => {
            await executor.ensureTable({
                name: "engagement_participants",
                columns: [
                    { name: "participant_id", type: "text", primaryKey: true },
                    { name: "revision", type: "integer", notNull: true },
                    {
                        name: "state_json",
                        type: "text",
                        notNull: true,
                    },
                ],
            });
            await executor.ensureTable({
                name: "engagement_participant_parts",
                columns: [
                    { name: "participant_id", type: "text", notNull: true },
                    { name: "position", type: "integer", notNull: true },
                    { name: "state_part", type: "text", notNull: true },
                ],
                primaryKey: ["participant_id", "position"],
            });
        })();
        try {
            await initialized;
        } catch (error) {
            initialized = undefined;
            throw error;
        }
        return executor;
    };
    return {
        async read(participantId): Promise<EngagementSnapshot> {
            const executor = await database();
            const result = await executor.executeCommand({
                option: "SELECT",
                table: "engagement_participants",
                alias: "participant",
                columns: [
                    { col: "participant.revision", as: "revision" },
                    { col: "participant.state_json", as: "state_json" },
                    { col: "parts.state_part", as: "state_part" },
                ],
                joins: [
                    {
                        type: "LEFT",
                        table: "engagement_participant_parts",
                        alias: "parts",
                        on: {
                            leftColumn: "participant.participant_id",
                            rightColumn: "parts.participant_id",
                        },
                    },
                ],
                where: [
                    {
                        column: "participant.participant_id",
                        value: participantId,
                    },
                ],
                orderBy: [{ column: "parts.position", direction: "ASC" }],
            });
            const row = result.rows?.[0];
            return row
                ? {
                      revision: Number(row.revision),
                      state: JSON.parse(
                          String(row.state_json) +
                              (result.rows ?? [])
                                  .map((part) =>
                                      typeof part.state_part === "string"
                                          ? part.state_part
                                          : "",
                                  )
                                  .join(""),
                      ) as EngagementState,
                  }
                : {
                      revision: 0,
                      state: { receipts: [], invalid: [], boosters: [] },
                  };
        },
        async commit(participantId, revision, state): Promise<void> {
            const executor = await database();
            const chunks = textChunks(JSON.stringify(state), 60_000);
            const first = chunks.next().value!;
            await executor.transaction(async (db) => {
                const values = {
                    revision: revision + 1,
                    state_json: first,
                };
                const result = await db.executeCommand(
                    revision === 0
                        ? {
                              option: "INSERT",
                              table: "engagement_participants",
                              values: {
                                  participant_id: participantId,
                                  ...values,
                              },
                              conflict: { action: "ignore" },
                          }
                        : {
                              option: "UPDATE",
                              table: "engagement_participants",
                              set: values,
                              where: [
                                  {
                                      column: "participant_id",
                                      value: participantId,
                                  },
                                  { column: "revision", value: revision },
                              ],
                          },
                );
                if (result.rowCount !== 1)
                    throw new Error("engagement_state_conflict");
                await db.executeCommand({
                    option: "DELETE",
                    table: "engagement_participant_parts",
                    where: [{ column: "participant_id", value: participantId }],
                });
                let position = 1;
                for (const part of chunks) {
                    await db.executeCommand({
                        option: "INSERT",
                        table: "engagement_participant_parts",
                        values: {
                            participant_id: participantId,
                            position,
                            state_part: part,
                        },
                    });
                    position++;
                }
            });
        },
    };
}
