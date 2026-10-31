import type { StudyAdapterBootstrapCtx } from "../../../gateways/study/gateway.js";
import type {
    NotificationEnvelope,
    NotificationDispatchResult,
} from "@cognis/core";

export function createNotificationDelivery(
    ctx: Pick<StudyAdapterBootstrapCtx, "capabilities" | "log">,
) {
    const { log } = ctx;
    return {
        accounts: {
            list: async () => {
                const accounts = ctx.capabilities.get<{
                    list(): Promise<
                        Array<{
                            accountId: string;
                            username: string;
                            enabled: boolean;
                            role?: string;
                            isFounder?: boolean;
                        }>
                    >;
                }>("auth:accountStore");
                if (!accounts) throw new Error("account_store_unavailable");
                return accounts.list();
            },
        },
        dispatch: async (envelope: NotificationEnvelope) => {
            try {
                const dispatch =
                    ctx.capabilities.get<
                        (
                            input: NotificationEnvelope,
                        ) => Promise<NotificationDispatchResult>
                    >("notify:dispatch");
                if (!dispatch)
                    throw new Error("notification_gateway_unavailable");
                const result = await dispatch(envelope);
                if (result.errors?.length)
                    await log?.(
                        "error",
                        "Study notification sender delivery failed.",
                        {
                            component: "study-library",
                            operation: "notify",
                            recipient: envelope.recipientUsername,
                            senderIds: result.errors.map(
                                ({ senderId }) => senderId,
                            ),
                        },
                    );
                if (!result.dispatched.length)
                    throw new Error("notification_not_delivered");
                await log?.("info", "Delivered Study notification.", {
                    component: "study-library",
                    operation: "notify",
                    recipient: envelope.recipientUsername,
                    senderIds: result.dispatched,
                });
                return result;
            } catch (error) {
                await log?.("error", "Study notification was not delivered.", {
                    component: "study-library",
                    operation: "notify",
                    recipient: envelope.recipientUsername,
                    errorName: error instanceof Error ? error.name : "Error",
                });
                throw error;
            }
        },
    };
}
