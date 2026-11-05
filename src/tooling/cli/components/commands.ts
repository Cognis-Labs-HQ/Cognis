import { renderComponentResults } from "./output.ts";
import { ensureBooleanAcknowledgement } from "../command-utils.ts";
import { register } from "../registry.ts";
import { apiGet, apiRequest, apiPut } from "../http.ts";
import { renderStructuredSummary } from "../formatters.ts";
import {
    selectComponents,
    selectionPath,
    batchExitCode,
    type Selection,
} from "./selection.ts";

export function registerComponentOperations(): void {
    for (const action of ["enable", "disable", "upgrade"])
        register(
            `component:${action}`,
            async ({ args, apiBaseUrl, getApiToken, reportProgress }) => {
                const selection = selectComponents(args);
                const payload = await apiRequest(
                    apiBaseUrl,
                    "/api/v1/components/actions",
                    {
                        method: "POST",
                        body: {
                            ...selection,
                            action,
                            acknowledge: args.includes(
                                "--ack-external-disclaimer",
                            ),
                        },
                        apiToken: await getApiToken(),
                        reportProgress,
                    },
                );
                const results = (
                    payload as {
                        data?: {
                            results?: Array<{
                                status: string;
                                target: { type: string; id: string };
                                data?: unknown;
                            }>;
                        };
                    }
                ).data?.results;
                if (!Array.isArray(results))
                    throw new Error("Invalid component action response.");
                for (const entry of results) {
                    if (
                        entry.status === "succeeded" &&
                        entry.target.type === "module" &&
                        action !== "upgrade" &&
                        !(entry.data as { unchanged?: boolean })?.unchanged
                    )
                        ensureBooleanAcknowledgement(
                            { data: entry.data },
                            "enabled",
                            action === "enable",
                            `Module "${entry.target.id}" was not ${action === "enable" ? "enabled" : "disabled"}`,
                        );
                }
                return payload;
            },
            {
                usage: `cognisctl component:${action} [<module|gateway> <id> | adapter <gatewayId> <adapterId> | [<type>] --all] [--ack-external-disclaimer]`,
                description: `${action[0].toUpperCase() + action.slice(1)} a module, gateway, or adapter, or all selected components.`,
                section: "Components",
                render: renderComponentResults,
                exitCode: batchExitCode,
            },
        );
    register(
        "component:info",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const selection = selectComponents(args);
            const token = await getApiToken();
            if (selection.target)
                return apiGet(
                    apiBaseUrl,
                    selectionPath(selection.target) + "/info",
                    token,
                );
            const payload = (await apiGet(
                apiBaseUrl,
                "/api/v1/components",
                token,
            )) as { data: Array<{ type: string; gatewayId?: string }> };
            return {
                data: payload.data.filter(
                    (item) =>
                        (!selection.type || item.type === selection.type) &&
                        (!selection.gatewayId ||
                            item.gatewayId === selection.gatewayId),
                ),
            };
        },
        {
            usage: "cognisctl component:info [<type> <id> [adapterId] | [<type>] --all]",
            description:
                "Read component identity, protection, lifecycle and upgrade metadata.",
            section: "Components",
            render: renderStructuredSummary,
        },
    );
    register(
        "component:release-channel",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const [action, ...rest] = args;
            if (!["get", "set", "list"].includes(action))
                throw new Error("Expected release-channel get, set or list.");
            const channel = action === "set" ? rest.pop() : undefined;
            if (action === "set" && (!channel || channel.startsWith("--")))
                throw new Error(
                    "Place the channel after the component selection.",
                );
            const selection = selectComponents(rest);
            const token = await getApiToken();
            let targets: Array<NonNullable<Selection["target"]>>;
            if (selection.target) targets = [selection.target];
            else {
                const inventory = (await apiGet(
                    apiBaseUrl,
                    "/api/v1/components",
                    token,
                )) as { data: Array<NonNullable<Selection["target"]>> };
                targets = inventory.data.filter(
                    (item) =>
                        (!selection.type || item.type === selection.type) &&
                        (!selection.gatewayId ||
                            item.gatewayId === selection.gatewayId),
                );
            }
            const results = [];
            for (const target of targets) {
                try {
                    const endpoint =
                        selectionPath(target) +
                        (action === "list"
                            ? "/release-channels"
                            : "/release-channel");
                    const data =
                        action === "set"
                            ? await apiPut(
                                  apiBaseUrl,
                                  endpoint,
                                  { channel },
                                  token,
                              )
                            : await apiGet(apiBaseUrl, endpoint, token);
                    results.push({ target, status: "succeeded", data });
                } catch (error) {
                    results.push({
                        target,
                        status: "failed",
                        code:
                            error instanceof Error
                                ? error.message
                                : "component_channel_failed",
                    });
                }
            }
            return { data: { results } };
        },
        {
            usage: "cognisctl component:release-channel <get|set|list> [<type> <id> [adapterId] | [<type>] --all] [channel]",
            description: "Read, choose or list component release channels.",
            section: "Components",
            render: renderComponentResults,
            exitCode: batchExitCode,
        },
    );
}
