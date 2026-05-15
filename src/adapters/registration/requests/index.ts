import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type {
    RegistrationGatewayAdapter,
    RegistrationRequestRecord,
} from "../../../gateways/registration/gateway.js";

function normalizeStatus(value: unknown): "pending" | "approved" | "rejected" {
    if (value === "approved") return "approved";
    if (value === "rejected") return "rejected";
    return "pending";
}

export function createAdapter(deps: {
    dbExecutor: DbExecutor;
}): RegistrationGatewayAdapter {
    const dbExecutor = deps.dbExecutor;
    let schemaInitialized: Promise<void> | null = null;

    function ensureReady(): Promise<void> {
        if (!schemaInitialized) {
            schemaInitialized = dbExecutor.ensureTable({
                name: "registration_requests",
                columns: [
                    { name: "id", type: "text", notNull: true, primaryKey: true },
                    { name: "provider", type: "text", notNull: true },
                    { name: "external_user_id", type: "text", notNull: true },
                    { name: "requested_account_id", type: "text", notNull: true },
                    { name: "requested_display_name", type: "text", notNull: true },
                    { name: "requested_email", type: "text" },
                    { name: "requested_profile_image_url", type: "text" },
                    {
                        name: "status",
                        type: "text",
                        notNull: true,
                        default: "pending",
                    },
                    {
                        name: "reviewed_by_account_id",
                        type: "text",
                    },
                    { name: "reviewed_at", type: "timestamp" },
                    {
                        name: "created_at",
                        type: "timestamp",
                        notNull: true,
                        default: "now",
                    },
                    {
                        name: "updated_at",
                        type: "timestamp",
                        notNull: true,
                        default: "now",
                    },
                ],
                uniqueKeys: [["provider", "external_user_id"]],
                indexes: [
                    { columns: ["status"] },
                    { columns: ["created_at"] },
                ],
            });
        }
        return schemaInitialized;
    }

    function mapRecord(
        row: Record<string, unknown>,
    ): RegistrationRequestRecord {
        return {
            id: String(row.id),
            provider: String(row.provider),
            externalUserId: String(row.external_user_id),
            requestedAccountId: String(row.requested_account_id),
            requestedDisplayName: String(row.requested_display_name),
            requestedEmail: row.requested_email
                ? String(row.requested_email)
                : undefined,
            requestedProfileImageUrl: row.requested_profile_image_url
                ? String(row.requested_profile_image_url)
                : undefined,
            status: normalizeStatus(row.status),
            createdAt: String(row.created_at),
            reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
            reviewedByAccountId: row.reviewed_by_account_id
                ? String(row.reviewed_by_account_id)
                : null,
        };
    }

    return {
        id: "requests",
        name: "Registration Requests",
        defaultEnabled: true,
        request: {
            async submitRequest(input) {
                await ensureReady();
                const now = new Date().toISOString();
                const requestId = randomUUID();
                await dbExecutor.executeCommand({
                    option: "INSERT",
                    table: "registration_requests",
                    values: {
                        id: requestId,
                        provider: input.provider,
                        external_user_id: input.externalUserId,
                        requested_account_id: input.requestedAccountId,
                        requested_display_name: input.requestedDisplayName,
                        requested_email: input.requestedEmail ?? null,
                        requested_profile_image_url:
                            input.requestedProfileImageUrl ?? null,
                        status: "pending",
                        reviewed_by_account_id: null,
                        reviewed_at: null,
                        created_at: now,
                        updated_at: now,
                    },
                    conflict: {
                        action: "update",
                        target: ["provider", "external_user_id"],
                        update: {
                            requested_account_id: input.requestedAccountId,
                            requested_display_name: input.requestedDisplayName,
                            requested_email: input.requestedEmail ?? null,
                            requested_profile_image_url:
                                input.requestedProfileImageUrl ?? null,
                            status: "pending",
                            reviewed_by_account_id: null,
                            reviewed_at: null,
                            updated_at: now,
                        },
                    },
                });
                const rowResult = await dbExecutor.executeCommand({
                    option: "SELECT",
                    table: "registration_requests",
                    columns: [
                        "id",
                        "provider",
                        "external_user_id",
                        "requested_account_id",
                        "requested_display_name",
                        "requested_email",
                        "requested_profile_image_url",
                        "status",
                        "reviewed_by_account_id",
                        "reviewed_at",
                        "created_at",
                    ],
                    where: [
                        { column: "provider", value: input.provider },
                        {
                            column: "external_user_id",
                            value: input.externalUserId,
                        },
                    ],
                    limit: 1,
                });
                return mapRecord(rowResult.rows?.[0] ?? {});
            },

            async listRequests(filter) {
                await ensureReady();
                const where =
                    filter?.status && filter.status !== "pending"
                        ? [{ column: "status", value: filter.status }]
                        : filter?.status === "pending"
                          ? [{ column: "status", value: "pending" }]
                          : undefined;
                const result = await dbExecutor.executeCommand({
                    option: "SELECT",
                    table: "registration_requests",
                    columns: [
                        "id",
                        "provider",
                        "external_user_id",
                        "requested_account_id",
                        "requested_display_name",
                        "requested_email",
                        "requested_profile_image_url",
                        "status",
                        "reviewed_by_account_id",
                        "reviewed_at",
                        "created_at",
                    ],
                    where,
                    orderBy: [{ column: "created_at", direction: "DESC" }],
                });
                return (result.rows ?? []).map((row) => mapRecord(row));
            },

            async reviewRequest(input) {
                await ensureReady();
                const status = normalizeStatus(input.status);
                if (status === "pending") {
                    throw new Error("invalid_review_status");
                }
                const now = new Date().toISOString();
                await dbExecutor.executeCommand({
                    option: "UPDATE",
                    table: "registration_requests",
                    set: {
                        status,
                        reviewed_by_account_id: input.reviewedByAccountId,
                        reviewed_at: now,
                        updated_at: now,
                    },
                    where: [{ column: "id", value: input.requestId }],
                });
                const result = await dbExecutor.executeCommand({
                    option: "SELECT",
                    table: "registration_requests",
                    columns: [
                        "id",
                        "provider",
                        "external_user_id",
                        "requested_account_id",
                        "requested_display_name",
                        "requested_email",
                        "requested_profile_image_url",
                        "status",
                        "reviewed_by_account_id",
                        "reviewed_at",
                        "created_at",
                    ],
                    where: [{ column: "id", value: input.requestId }],
                    limit: 1,
                });
                const row = result.rows?.[0];
                if (!row) return null;
                return mapRecord(row);
            },

            async getRequestByIdentity(input) {
                await ensureReady();
                const result = await dbExecutor.executeCommand({
                    option: "SELECT",
                    table: "registration_requests",
                    columns: [
                        "id",
                        "provider",
                        "external_user_id",
                        "requested_account_id",
                        "requested_display_name",
                        "requested_email",
                        "requested_profile_image_url",
                        "status",
                        "reviewed_by_account_id",
                        "reviewed_at",
                        "created_at",
                    ],
                    where: [
                        { column: "provider", value: input.provider },
                        {
                            column: "external_user_id",
                            value: input.externalUserId,
                        },
                    ],
                    limit: 1,
                });
                const row = result.rows?.[0];
                if (!row) return null;
                return mapRecord(row);
            },
        },
    };
}
