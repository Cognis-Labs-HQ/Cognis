import {
    registerBootstrapFlow,
    type BootstrapDisposer,
    type Ctx,
} from "@cognis/core";
import type { BootstrapLog } from "../../shared.js";

export function createShareMaintenance(
    root: Ctx,
    jobs: Array<{ operation: string; run(signal: AbortSignal): Promise<void> }>,
    log: BootstrapLog | undefined,
    intervalMs: number,
): BootstrapDisposer & { run(): Promise<void> } {
    const flowId = "share:maintenance";
    const registration = registerBootstrapFlow(root, {
        id: flowId,
        stages: jobs.map((job) => job.operation),
    });
    let active = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending: Promise<void> | undefined;
    let generation = 0;
    let controller = new AbortController();
    for (const job of jobs) {
        registration.extend(
            job.operation,
            { id: `share:${job.operation}` },
            async ({ input, data }) => {
                if (
                    !active ||
                    (input as { generation: number }).generation !==
                        generation ||
                    data.failed
                )
                    return;
                try {
                    await job.run(controller.signal);
                } catch (error) {
                    // End this pass on failure instead of adding work to an unavailable database.
                    data.failed = true;
                    const code =
                        error instanceof Error
                            ? Reflect.get(error, "code")
                            : undefined;
                    log?.(
                        "error",
                        "Share maintenance failed; retrying on the next scheduled pass.",
                        {
                            component: "share-gateway",
                            operation: job.operation,
                            errorName:
                                error instanceof Error
                                    ? error.name
                                    : "UnknownError",
                            ...(typeof code === "string" &&
                            /^[A-Z0-9_]{2,64}$/.test(code)
                                ? { code }
                                : {}),
                        },
                    );
                }
            },
        );
    }
    const run = (): Promise<void> => {
        if (!active) return Promise.resolve();
        if (pending) return pending;
        pending = root.flow
            .run(flowId, { generation })
            .then(() => undefined)
            .catch((error) => {
                log?.("error", "Share maintenance flow failed.", {
                    component: "share-gateway",
                    operation: "maintenance",
                    errorName:
                        error instanceof Error ? error.name : "UnknownError",
                });
            })
            .finally(() => {
                pending = undefined;
            });
        return pending;
    };
    const schedule = () => {
        if (!active) return;
        const scheduledGeneration = generation;
        timer = setTimeout(() => {
            void run().finally(() => {
                if (scheduledGeneration === generation) schedule();
            });
        }, intervalMs);
        timer.unref?.();
    };
    const dispose: BootstrapDisposer & { run(): Promise<void> } = Object.assign(
        () => {
            active = false;
            controller.abort();
            generation++;
            clearTimeout(timer);
        },
        { run },
    );
    dispose.reactivate = () => {
        if (active) return;
        active = true;
        controller = new AbortController();
        generation++;
        schedule();
    };
    dispose.reactivate();
    return dispose;
}
