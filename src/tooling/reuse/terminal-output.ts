import { format } from "node:util";

/** Render command/build reports to their terminal stream, independently of application telemetry. */
export function writeTerminalReport(
    stream: "stdout" | "stderr",
    ...values: unknown[]
): void {
    process[stream].write(`${format(...values)}\n`);
}
