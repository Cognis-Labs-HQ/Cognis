import { conciseText } from "./output-summary.ts";

/** Human progress belongs on stderr so stdout remains a final result. */
export function describeProgress(event: Record<string, unknown>): string {
    const target = event.target as
        { type?: string; gatewayId?: string; id?: string } | undefined;
    const identity = target
        ? `${target.type} ${[target.gatewayId, target.id].filter(Boolean).join("/")}`
        : "Components";
    const phases: Record<string, string> = {
        preparing: "Checking selection and dependencies",
        queued: "Waiting for the current operation",
        starting: "Starting",
        disabling: "Temporarily disabling",
        installing: "Installing selected release",
        waiting: "Waiting for installation to finish",
        restoring: "Restoring previous enabled state",
        succeeded: "Completed",
        skipped: "Skipped",
        failed: "Failed",
    };
    const detail = phases[String(event.phase)] ?? conciseText(event.phase);
    return `${conciseText(identity)}: ${detail}${event.channel ? ` (${conciseText(event.channel, 60)})` : ""}${typeof event.elapsedSeconds === "number" ? ` — ${event.elapsedSeconds}s elapsed` : ""}${event.code ? ` — ${conciseText(event.code)}` : ""}`;
}

export async function withCommandProgress<T>(
    command: string,
    operation: () => Promise<T>,
    write: (line: string) => void,
): Promise<T> {
    const started = Date.now();
    write(`${command}: working…`);
    const timer = setInterval(
        () =>
            write(
                `${command}: still working (${Math.floor((Date.now() - started) / 1000)}s elapsed)…`,
            ),
        10_000,
    );
    timer.unref();
    try {
        return await operation();
    } finally {
        clearInterval(timer);
    }
}
