import { createNotificationMessages } from "./reuse/notification-messages.js";
import type { FlowApi } from "@cognis/core";
import { runOperation } from "./reuse/operation.js";
import type { LibraryPushRequest } from "./types.js";
import type { LibraryActor } from "./contracts.js";

interface RequestNotificationPorts {
    flow?: FlowApi;
    accounts: {
        list(): Promise<
            Array<{
                username: string;
                enabled: boolean;
                role?: string;
                isFounder?: boolean;
            }>
        >;
    };
    dispatch(input: {
        category: string;
        recipientUsername: string;
        subject: string;
        body: string;
        actionUrl: string;
        metadata: Record<string, unknown>;
    }): Promise<unknown>;
    log?: (
        level: string,
        message: string,
        metadata: Record<string, unknown>,
    ) => unknown;
}

export function createRequestNotifier({
    accounts,
    flow,
    dispatch,
    log,
}: RequestNotificationPorts) {
    const messages = createNotificationMessages();
    return async (
        request: LibraryPushRequest,
        actor: LibraryActor,
    ): Promise<void> => {
        try {
            await runOperation(
                flow,
                "study:library:notifyRequest",
                { requestId: request.id, status: request.status },
                {
                    deliver: async () => {
                        const localizedText = await messages(request.status, {
                            account: actor.accountId,
                            request: request.id,
                        });
                        const recipients = (await accounts.list()).filter(
                            (account) =>
                                account.enabled &&
                                (request.status === "pending" ||
                                    account.username !== actor.accountId) &&
                                (account.isFounder ||
                                    ["admin", "owner"].includes(
                                        account.role ?? "",
                                    )),
                        );
                        const results = await Promise.allSettled(
                            recipients.map(({ username }) =>
                                dispatch({
                                    category: "study",
                                    recipientUsername: username,
                                    subject: localizedText.en.subject,
                                    body: localizedText.en.body,
                                    actionUrl: "/study/library/requests",
                                    metadata: {
                                        requestId: request.id,
                                        status: request.status,
                                        actorId: actor.accountId,
                                        localizedText,
                                    },
                                }),
                            ),
                        );
                        for (const result of results)
                            if (result.status === "rejected")
                                await log?.(
                                    "error",
                                    "Study request notification delivery failed.",
                                    {
                                        component: "study-library",
                                        operation: "notifyRequest",
                                        requestId: request.id,
                                        errorName:
                                            result.reason instanceof Error
                                                ? result.reason.name
                                                : "Error",
                                    },
                                );
                    },
                },
            );
        } catch (error) {
            await log?.("error", "Study request notification failed.", {
                component: "study-library",
                operation: "notifyRequest",
                requestId: request.id,
                errorName: error instanceof Error ? error.name : "Error",
            });
        }
    };
}
