import type { FlowApi } from "@cognis/core";
import { runOperation } from "./reuse/operation.js";
import { readFile } from "node:fs/promises";
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

async function messages(
    locale: string,
    status: string,
): Promise<{ subject: string; body: string }> {
    const xml = await readFile(
        new URL(`./ui/languages/${locale}/strings.xml`, import.meta.url),
        "utf8",
    );
    const get = (suffix: string) => {
        const key = `adapter.study.library.notification_${status}_${suffix}`;
        const value = xml.match(
            new RegExp(
                `<string name="${key.replaceAll(".", "\\.")}">([^<]+)</string>`,
            ),
        )?.[1];
        if (!value) throw new Error("missing_request_translation");
        return value
            .replaceAll("&amp;", "&")
            .replaceAll("&lt;", "<")
            .replaceAll("&gt;", ">")
            .replaceAll("&quot;", '"')
            .replaceAll("&apos;", "'");
    };
    return { subject: get("subject"), body: get("body") };
}

export function createRequestNotifier({
    accounts,
    flow,
    dispatch,
    log,
}: RequestNotificationPorts) {
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
                        const localizedText = Object.fromEntries(
                            await Promise.all(
                                ["en", "de", "ja", "id"].map(async (locale) => {
                                    const copy = await messages(
                                        locale,
                                        request.status,
                                    );
                                    return [
                                        locale,
                                        {
                                            subject: copy.subject,
                                            body: copy.body
                                                .replaceAll(
                                                    "{{ account }}",
                                                    actor.accountId,
                                                )
                                                .replaceAll(
                                                    "{{ request }}",
                                                    request.id,
                                                ),
                                        },
                                    ];
                                }),
                            ),
                        );
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
