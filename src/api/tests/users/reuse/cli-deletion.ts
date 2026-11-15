import { recoverComponentRequest } from "../../../components/http-failure.js";
import { createHarness } from "./harness.js";

export type DeletionFault =
    | "none"
    | "before-persist"
    | "after-persist"
    | "lost-response"
    | "lost-request"
    | "rejected"
    | "malformed-response";

interface CliDeletionFixture {
    fetch: typeof globalThis.fetch;
    snapshot(): Promise<{
        requests: Array<{ method: string; path: string; status?: number }>;
        recoveryCount: number;
        faultReached: boolean;
        exists: boolean;
        deletes: number;
        logs: Awaited<ReturnType<typeof createHarness>>["logs"];
    }>;
    dispose(): Promise<void>;
}

export async function createCliDeletionFixture(
    fault: DeletionFault,
    responseStatus?: number,
): Promise<CliDeletionFixture> {
    let started = false;
    const harness = await createHarness(
        fault === "rejected"
            ? {
                  policy: async ({ accountId }) =>
                      started
                          ? { allowed: false, status: 403, code: "forbidden" }
                          : { allowed: true, accountId, isCurrent: () => true },
              }
            : {},
    );
    const requests: Array<{ method: string; path: string; status?: number }> =
        [];
    let recoveryCount = 0;
    let faultReached = false;
    harness.context.runtime.flow.extend(
        "deprovision-user",
        "authorize-request",
        { id: "test:observe-cli-start", order: -1000 },
        () => {
            started = true;
        },
    );
    if (fault === "before-persist" || fault === "after-persist") {
        harness.context.runtime.flow.extend(
            "deprovision-user",
            fault === "before-persist"
                ? "authorize-request"
                : "cleanup-dependencies",
            { id: `test:${fault}`, order: 1000 },
            () => {
                faultReached = true;
                throw new Error("private disposal fixture details");
            },
        );
    }
    const fetch: typeof globalThis.fetch = async (url, options) => {
        const target = new URL(String(url));
        if (target.origin !== "https://cli-audit.invalid")
            throw new Error("Fixture forbids network access");
        const request = {
            method: options?.method ?? "GET",
            path: target.pathname,
            status: undefined as number | undefined,
        };
        requests.push(request);
        if (fault === "lost-request" && request.method === "DELETE") {
            faultReached = true;
            throw new TypeError("private request transport details");
        }
        const response = await harness.request({
            ...request,
            recover: async (error, req, res) => {
                recoveryCount += 1;
                await recoverComponentRequest(
                    req,
                    res,
                    error,
                    undefined,
                    () => undefined,
                );
            },
        });
        if (!response.handled) throw new Error("Unhandled fixture route");
        request.status = response.status;
        if (request.method === "DELETE") {
            if (fault === "lost-response") {
                faultReached = true;
                throw new TypeError("private response transport details");
            }
            if (fault === "malformed-response") {
                faultReached = true;
                return Response.json({ data: {} });
            }
        }
        if (request.method === "DELETE" && responseStatus !== undefined) {
            request.status = responseStatus;
            return Response.json(response.body, { status: responseStatus });
        }
        return Response.json(response.body, { status: response.status });
    };
    return {
        fetch,
        async snapshot() {
            return {
                requests,
                recoveryCount,
                faultReached,
                exists: await harness.accounts.exists("target"),
                deletes: harness.accounts.calls.filter(
                    (call) => call === "delete",
                ).length,
                logs: harness.logs,
            };
        },
        async dispose() {
            for (const dispose of [
                ...harness.context.outcomeDisposers,
                ...harness.context.disposers,
            ])
                await dispose();
        },
    };
}
