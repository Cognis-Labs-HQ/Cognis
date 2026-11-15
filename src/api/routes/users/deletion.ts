import type { ServerResponse } from "node:http";
import type { BootstrapLog, FlowApi } from "@cognis/core";
import type { DeprovisionOutcome } from "./deprovision-outcome.js";
import { rejectAccountTarget } from "./account-target.js";

type PersistedDeletion = Extract<DeprovisionOutcome, { persisted: true }>;

type DeletionFailure =
    | {
          status: 400 | 403 | 404;
          code: string;
          deleted: false;
          outcome: "rejected";
      }
    | {
          status: 503;
          code: "account_policy_unavailable";
          deleted: null;
          outcome: "unknown";
      }
    | {
          status: 500;
          code: string;
          deleted: true | null;
          outcome: "committed" | "unknown";
      };

function classifyFailure(
    outcome: DeprovisionOutcome | undefined,
    username: string,
): DeletionFailure {
    if (
        outcome?.persisted &&
        outcome.action === "delete" &&
        outcome.username === username
    ) {
        return {
            status: 500,
            code: "user_deletion_cleanup_incomplete",
            deleted: true,
            outcome: "committed",
        };
    }
    if (outcome?.persisted === false && outcome.status !== 503) {
        return {
            status: outcome.status,
            code: outcome.reason,
            deleted: false,
            outcome: "rejected",
        };
    }
    return {
        status: 500,
        code: "user_deletion_outcome_unknown",
        deleted: null,
        outcome: "unknown",
    };
}

function writeFailure(res: ServerResponse, failure: DeletionFailure): void {
    if (failure.outcome === "rejected" || failure.status === 503) {
        rejectAccountTarget(
            res,
            {
                allowed: false,
                status: failure.status,
                code: failure.code,
            },
            { deleted: failure.deleted, outcome: failure.outcome },
        );
        return;
    }
    res.writeHead(failure.status, { "content-type": "application/json" });
    res.end(
        JSON.stringify({
            error: {
                code: failure.code,
            },
            data: {
                deleted: failure.deleted,
                outcome: failure.outcome,
                ...(failure.deleted === true ? { cleanup: "incomplete" } : {}),
            },
        }),
    );
}

function completedStageResults(
    result: unknown,
    invocation: object | undefined,
): object | undefined {
    if (
        !result ||
        typeof result !== "object" ||
        Array.isArray(result) ||
        !invocation
    )
        return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(result);
    const data = descriptors.data?.value;
    if (
        descriptors.flowId?.value !== "deprovision-user" ||
        descriptors.stageResults?.value !== invocation ||
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
    )
        return undefined;
    return invocation;
}

/** Retain invocation identity, never public stage values, for the owner's receipt. */
export async function runUserDeletion(
    flow: FlowApi,
    input: Readonly<{ username: string }>,
    readOutcome: (input: unknown, stageResults: object) => DeprovisionOutcome,
    res: ServerResponse,
    log?: BootstrapLog,
): Promise<PersistedDeletion | undefined> {
    let invocation: object | undefined;
    let outcome: DeprovisionOutcome | undefined;
    let result: unknown;
    try {
        result = await flow.run("deprovision-user", input, {
            handlers: {
                "authorize-request": (stage) => {
                    invocation = stage.stageResults;
                },
            },
        });
    } catch (error) {
        outcome = invocation ? readOutcome(input, invocation) : undefined;
        const failure = classifyFailure(outcome, input.username);
        log?.("error", "User deletion flow failed.", {
            component: "api-users",
            operation: "deprovision-user",
            targetAccountId: input.username,
            outcome: failure.code,
            errorName: error instanceof Error ? error.name : "UnknownError",
        });
        writeFailure(res, failure);
        // The server recovery boundary still owns fault attribution and component recovery.
        throw error;
    }
    let completionErrorName: string | undefined;
    try {
        const results = completedStageResults(result, invocation);
        outcome = results ? readOutcome(input, results) : undefined;
    } catch (error) {
        completionErrorName =
            error instanceof Error ? error.name : "UnknownError";
    }
    if (
        outcome?.persisted &&
        outcome.action === "delete" &&
        outcome.username === input.username
    ) {
        return outcome;
    }
    const failure: DeletionFailure =
        outcome?.persisted === false &&
        outcome.status === 503 &&
        outcome.reason === "account_policy_unavailable"
            ? {
                  status: 503,
                  code: "account_policy_unavailable",
                  deleted: null,
                  outcome: "unknown",
              }
            : classifyFailure(outcome, input.username);
    log?.("error", "User deletion has no confirmed persisted outcome.", {
        component: "api-users",
        operation: "deprovision-user",
        targetAccountId: input.username,
        outcome: failure.code,
        ...(completionErrorName ? { errorName: completionErrorName } : {}),
    });
    writeFailure(res, failure);
    return undefined;
}
