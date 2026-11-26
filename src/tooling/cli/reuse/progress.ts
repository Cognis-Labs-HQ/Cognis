import { conciseText } from "./output-summary.ts";

export function componentLabel(
    target: { type?: string; gatewayId?: string; id?: string },
    scope?: string,
): string {
    const kind = target.type ?? "component";
    return `${kind.charAt(0).toUpperCase() + kind.slice(1)} ${[target.gatewayId, target.id ?? "unknown", scope].filter(Boolean).join("/")}`;
}

function commandLabel(command: string): string {
    const label = command.replace(/[:_-]/g, " ");
    return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Human progress belongs on stderr so stdout remains a final result. */
export function describeProgress(event: Record<string, unknown>): string {
    const target = event.target as
        { type?: string; gatewayId?: string; id?: string } | undefined;
    const identity = target ? componentLabel(target) : "Components";
    const phases: Record<string, string> = {
        preparing: "checking selection and dependencies",
        queued: "waiting for the current operation",
        starting: "starting",
        disabling: "temporarily disabling",
        installing: "installing selected release",
        waiting: "waiting for installation to finish",
        restoring: "restoring previous enabled state",
        succeeded: "completed",
        skipped: "skipped",
        failed: "failed",
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
    write(`${commandLabel(command)}: working…`);
    const timer = setInterval(
        () =>
            write(
                `${commandLabel(command)}: still working (${Math.floor((Date.now() - started) / 1000)}s elapsed)…`,
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
