import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../../db/reuse/db-executor.js";

export type ShareApprovalDecision = "pending" | "approved" | "declined";

export interface ShareApprovalRequestRecord {
    id: string;
    mintRequestId: string;
    resourceType: string;
    resourceId: string;
    requesterAccountId: string;
    requesterDisplayName: string;
    targetAccountId: string;
    status: ShareApprovalDecision;
    createdAt: string;
    expiresAt: string;
    respondedAt: string | null;
}

function isExpired(expiresAt: string): boolean {
    return Boolean(expiresAt) && new Date(expiresAt).getTime() <= Date.now();
}

function parseRecord(
    row: Record<string, unknown>,
): ShareApprovalRequestRecord | null {
    const id = String(row.id ?? "").trim();
    const mintRequestId = String(row.mint_request_id ?? "").trim();
    const resourceType = String(row.resource_type ?? "").trim();
    const resourceId = String(row.resource_id ?? "").trim();
    const requesterAccountId = String(row.requester_account_id ?? "").trim();
    const targetAccountId = String(row.target_account_id ?? "").trim();
    const createdAt = String(row.created_at ?? "").trim();
    const expiresAt = String(row.expires_at ?? "").trim();
    const status = String(row.status ?? "pending").trim();
    if (
        !id ||
        !mintRequestId ||
        !resourceType ||
        !resourceId ||
        !requesterAccountId ||
        !targetAccountId ||
        !createdAt ||
        !expiresAt ||
        (status !== "pending" && status !== "approved" && status !== "declined")
    ) {
        return null;
    }
    const respondedAt = String(row.responded_at ?? "").trim();
    return {
        id,
        mintRequestId,
        resourceType,
        resourceId,
        requesterAccountId,
        requesterDisplayName: String(row.requester_display_name ?? "").trim(),
        targetAccountId,
        status,
        createdAt,
        expiresAt,
        respondedAt: respondedAt ? respondedAt : null,
    };
}

/**
 * Persists per-target share-link creation approval requests. When minting a
 * share token for a resource with other attached users (e.g. meeting
 * participants), one row is created per target user under a shared
 * `mintRequestId`. The `request-approval` stage of `mint-share-token`
 * (see flow-registrations.ts) polls this store until every target has
 * responded, any target declines, or the 60-second expiry is reached (at
 * which point pending rows auto-resolve to "approved").
 */
export class ShareApprovalRequestStore {
    constructor(private readonly db: DbExecutor) {}

    async ensureSchema(): Promise<void> {
        await this.db.ensureTable({
            name: "share_approval_requests",
            columns: [
                { name: "id", type: "text", primaryKey: true },
                { name: "mint_request_id", type: "text", notNull: true },
                { name: "resource_type", type: "text", notNull: true },
                { name: "resource_id", type: "text", notNull: true },
                {
                    name: "requester_account_id",
                    type: "text",
                    notNull: true,
                },
                { name: "requester_display_name", type: "text" },
                { name: "target_account_id", type: "text", notNull: true },
                { name: "status", type: "text", notNull: true },
                { name: "created_at", type: "text", notNull: true },
                { name: "expires_at", type: "text", notNull: true },
                { name: "responded_at", type: "text" },
            ],
        });
    }

    async createBatch(input: {
        resourceType: string;
        resourceId: string;
        requesterAccountId: string;
        requesterDisplayName: string;
        targetAccountIds: string[];
        ttlSeconds: number;
    }): Promise<{ mintRequestId: string; rows: ShareApprovalRequestRecord[] }> {
        const mintRequestId = randomUUID();
        const createdAt = new Date().toISOString();
        const expiresAt = new Date(
            Date.now() + Math.max(1, input.ttlSeconds) * 1000,
        ).toISOString();
        const rows: ShareApprovalRequestRecord[] = input.targetAccountIds.map(
            (targetAccountId) => ({
                id: randomUUID(),
                mintRequestId,
                resourceType: String(input.resourceType ?? "").trim(),
                resourceId: String(input.resourceId ?? "").trim(),
                requesterAccountId: String(
                    input.requesterAccountId ?? "",
                ).trim(),
                requesterDisplayName: String(
                    input.requesterDisplayName ?? "",
                ).trim(),
                targetAccountId,
                status: "pending",
                createdAt,
                expiresAt,
                respondedAt: null,
            }),
        );
        for (const row of rows) {
            await this.db.executeCommand({
                option: "INSERT",
                table: "share_approval_requests",
                values: {
                    id: row.id,
                    mint_request_id: row.mintRequestId,
                    resource_type: row.resourceType,
                    resource_id: row.resourceId,
                    requester_account_id: row.requesterAccountId,
                    requester_display_name: row.requesterDisplayName,
                    target_account_id: row.targetAccountId,
                    status: row.status,
                    created_at: row.createdAt,
                    expires_at: row.expiresAt,
                    responded_at: row.respondedAt,
                },
            });
        }
        return { mintRequestId, rows };
    }

    async listByMintRequestId(
        mintRequestId: string,
    ): Promise<ShareApprovalRequestRecord[]> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "share_approval_requests",
            where: [
                {
                    column: "mint_request_id",
                    value: String(mintRequestId ?? "").trim(),
                },
            ],
        });
        return (result.rows ?? [])
            .map((row) => parseRecord(row))
            .filter((record): record is ShareApprovalRequestRecord =>
                Boolean(record),
            );
    }

    async listPendingForTarget(
        targetAccountId: string,
    ): Promise<ShareApprovalRequestRecord[]> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "share_approval_requests",
            where: [
                {
                    column: "target_account_id",
                    value: String(targetAccountId ?? "").trim(),
                },
                { column: "status", value: "pending" },
            ],
            orderBy: [{ column: "created_at", direction: "DESC" }],
        });
        const records = (result.rows ?? [])
            .map((row) => parseRecord(row))
            .filter((record): record is ShareApprovalRequestRecord =>
                Boolean(record),
            );
        return records.filter((record) => !isExpired(record.expiresAt));
    }

    async respond(input: {
        approvalId: string;
        targetAccountId: string;
        decision: "approved" | "declined";
    }): Promise<boolean> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "share_approval_requests",
            where: [
                { column: "id", value: String(input.approvalId ?? "").trim() },
            ],
            limit: 1,
        });
        const record = parseRecord(result.rows?.[0] ?? {});
        if (!record) return false;
        if (
            record.targetAccountId !==
            String(input.targetAccountId ?? "").trim()
        ) {
            return false;
        }
        if (record.status !== "pending" || isExpired(record.expiresAt)) {
            return false;
        }
        await this.db.executeCommand({
            option: "UPDATE",
            table: "share_approval_requests",
            where: [{ column: "id", value: record.id }],
            set: {
                status: input.decision,
                responded_at: new Date().toISOString(),
            },
        });
        return true;
    }

    /**
     * Auto-resolves any still-pending, expired rows for a mint request to
     * "approved" (the 60-second timeout fallback), then returns the current
     * decision summary.
     */
    async resolveExpiredAndSummarize(mintRequestId: string): Promise<{
        allResponded: boolean;
        anyDeclined: boolean;
    }> {
        const rows = await this.listByMintRequestId(mintRequestId);
        for (const row of rows) {
            if (row.status === "pending" && isExpired(row.expiresAt)) {
                await this.db.executeCommand({
                    option: "UPDATE",
                    table: "share_approval_requests",
                    where: [{ column: "id", value: row.id }],
                    set: {
                        status: "approved",
                        responded_at: new Date().toISOString(),
                    },
                });
                row.status = "approved";
            }
        }
        return {
            allResponded: rows.every((row) => row.status !== "pending"),
            anyDeclined: rows.some((row) => row.status === "declined"),
        };
    }

    async purgeExpired(): Promise<void> {
        const nowIso = new Date().toISOString();
        await this.db.executeCommand({
            option: "DELETE",
            table: "share_approval_requests",
            where: [
                { column: "expires_at", operator: "!=", value: "" as const },
                { column: "expires_at", operator: "<", value: nowIso },
            ],
        });
    }
}
