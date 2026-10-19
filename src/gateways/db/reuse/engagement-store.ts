import type {
    EngagementStore,
    EngagementSnapshot,
    EngagementState,
} from "@cognis/core";
import type { DbExecutor } from "./db-executor.js";

/** Persist participant reward ledgers through the database gateway's public contract. */
export function createEngagementStore(
    resolveDatabase: () => DbExecutor,
): EngagementStore {
    let initialized: Promise<void> | undefined;
    const database = async () => {
        const executor = resolveDatabase();
        initialized ??= executor.ensureTable({
            name: "engagement_participants",
            columns: [
                { name: "participant_id", type: "text", primaryKey: true },
                { name: "revision", type: "integer", notNull: true },
                {
                    name: "state_json",
                    type: "text",
                    textSize: "large",
                    notNull: true,
                },
            ],
        });
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
                where: [{ column: "participant_id", value: participantId }],
            });
            const row = result.rows?.[0];
            return row
                ? {
                      revision: Number(row.revision),
                      state: JSON.parse(
                          String(row.state_json),
                      ) as EngagementState,
                  }
                : {
                      revision: 0,
                      state: { receipts: [], invalid: [], boosters: [] },
                  };
        },
        async commit(participantId, revision, state): Promise<void> {
            const executor = await database();
            const values = {
                revision: revision + 1,
                state_json: JSON.stringify(state),
            };
            const result = await executor.executeCommand(
                revision === 0
                    ? {
                          option: "INSERT",
                          table: "engagement_participants",
                          values: { participant_id: participantId, ...values },
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
        },
    };
}
