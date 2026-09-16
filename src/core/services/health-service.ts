export interface HealthContribution {
    componentId: string;
    componentType: "module" | "gateway" | "adapter" | "system";
    status: "ok" | "warning" | "error";
    message?: string;
    checkedAt?: string;
    data?: Record<string, unknown>;
}

export type HealthContributor = () =>
    HealthContribution | Promise<HealthContribution>;

export interface HealthStatus {
    status: "ok" | "warning" | "error";
    timestamp: string;
    startedAt: string;
    uptimeMs: number;
    contributions: HealthContribution[];
}

function resolveStatus(
    contributions: HealthContribution[],
): "ok" | "warning" | "error" {
    if (contributions.some((contribution) => contribution.status === "error")) {
        return "error";
    }
    if (
        contributions.some((contribution) => contribution.status === "warning")
    ) {
        return "warning";
    }
    return "ok";
}

export class HealthService {
    private readonly startedAtDate = new Date();
    private readonly contributors = new Map<string, HealthContributor>();

    contribute(componentId: string, contributor: HealthContributor): void {
        this.contributors.set(componentId, contributor);
    }

    async status(now = new Date()): Promise<HealthStatus> {
        const contributions: HealthContribution[] = [];
        for (const [componentId, contributor] of this.contributors) {
            try {
                contributions.push(await contributor());
            } catch (error) {
                contributions.push({
                    componentId,
                    componentType: "system",
                    status: "error",
                    message:
                        error instanceof Error ? error.message : String(error),
                    checkedAt: now.toISOString(),
                });
            }
        }

        return {
            status: resolveStatus(contributions),
            timestamp: now.toISOString(),
            startedAt: this.startedAtDate.toISOString(),
            uptimeMs: Math.max(0, now.getTime() - this.startedAtDate.getTime()),
            contributions,
        };
    }
}
