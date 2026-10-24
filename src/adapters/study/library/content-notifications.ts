import type { FlowApi } from "@cognis/core";
import type { LibraryActor } from "./contracts.js";
import type { LibraryEntry } from "./types.js";
import type { createNotificationDelivery } from "./notification-delivery.js";
import { createNotificationMessages } from "./reuse/notification-messages.js";
import { runOperation } from "./reuse/operation.js";

export function createContentNotifiers({
    accounts,
    dispatch,
    flow,
    log,
}: ReturnType<typeof createNotificationDelivery> & {
    flow: FlowApi;
    log?: (
        level: string,
        message: string,
        metadata: Record<string, unknown>,
    ) => unknown;
}) {
    const messages = createNotificationMessages();
    const deliver = async (
        kind: "content" | "deletion",
        recipients: Map<string, Record<string, string>>,
    ): Promise<void> => {
        try {
            await runOperation(
                flow,
                "study:library:notifyContent",
                { kind, recipients: [...recipients.keys()] },
                {
                    deliver: async () => {
                        const results = await Promise.allSettled(
                            Array.from(
                                recipients,
                                async ([recipientUsername, values]) => {
                                    const localizedText = await messages(
                                        kind,
                                        values,
                                    );
                                    await dispatch({
                                        category: "study",
                                        recipientUsername,
                                        ...localizedText.en,
                                        actionUrl: "/study/library",
                                        metadata: { localizedText },
                                    });
                                },
                            ),
                        );
                        for (const result of results)
                            if (result.status === "rejected")
                                await log?.(
                                    "error",
                                    "Study content notification delivery failed.",
                                    {
                                        component: "study-library",
                                        operation: "notifyContent",
                                        kind,
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
            await log?.("error", "Study content notification failed.", {
                component: "study-library",
                operation: "notifyContent",
                kind,
                errorName: error instanceof Error ? error.name : "Error",
            });
        }
    };
    return {
        newContent: async ({
            entryCount,
        }: {
            entryCount: number;
            language?: string;
        }): Promise<void> => {
            try {
                const recipients = (await accounts.list()).filter(
                    ({ enabled }) => enabled,
                );
                await deliver(
                    "content",
                    new Map(
                        recipients.map(({ username }) => [
                            username,
                            { count: String(entryCount) },
                        ]),
                    ),
                );
            } catch (error) {
                await log?.(
                    "error",
                    "Study content notification recipients could not be loaded.",
                    {
                        component: "study-library",
                        operation: "notifyContent",
                        kind: "content",
                        errorName:
                            error instanceof Error ? error.name : "Error",
                    },
                );
            }
        },
        deletedContent: async (
            entries: readonly LibraryEntry[],
            actor: LibraryActor,
        ): Promise<void> => {
            const labels = new Map<string, string[]>();
            for (const entry of entries) {
                const recipient =
                    entry.scope === "user" ? entry.scopeId : entry.createdBy;
                if (
                    recipient === actor.accountId ||
                    recipient.startsWith("content-pack:")
                )
                    continue;
                labels.set(recipient, [
                    ...(labels.get(recipient) ?? []),
                    entry.label,
                ]);
            }
            await deliver(
                "deletion",
                new Map(
                    Array.from(labels, ([recipient, cards]) => [
                        recipient,
                        { cards: cards.join(" · ") },
                    ]),
                ),
            );
        },
    };
}
