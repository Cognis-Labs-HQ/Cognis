import { monitorEventLoopDelay } from "node:perf_hooks";
import type { GatewayBootstrapContext } from "../shared.js";

export type MetricLabels = Record<string, string>;

export interface ObservabilityCapability {
    record(name: string, value: number, labels?: MetricLabels): void;
}

const ALLOWED_METRICS = new Set([
    "http.server.duration_ms",
    "http.server.response_bytes",
    "db.duration_ms",
    "cache.outcome",
    "event_loop.delay_ms",
    "web.lcp_ms",
    "web.inp_ms",
    "web.cls",
    "web.ttfb_ms",
    "web.resource_count",
    "web.transfer_bytes",
    "web.route_mount_ms",
]);
const ALLOWED_LABELS = new Set([
    "method",
    "route",
    "status_class",
    "cache",
    "navigation",
    "metric",
]);

function boundedLabels(labels: MetricLabels = {}): MetricLabels {
    return Object.fromEntries(
        Object.entries(labels)
            .filter(([key]) => ALLOWED_LABELS.has(key))
            .map(([key, value]) => [key, String(value).slice(0, 80)]),
    );
}

export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const record = (name: string, value: number, labels?: MetricLabels) => {
        if (!ALLOWED_METRICS.has(name) || !Number.isFinite(value)) return;
        ctx.log?.("debug", "Performance metric recorded.", {
            component: "observability",
            metric: name,
            value,
            labels: boundedLabels(labels),
        });
    };
    const capability: ObservabilityCapability = { record };
    ctx.capabilities.contribute("observability:metrics", capability);

    const eventLoopDelay = monitorEventLoopDelay({ resolution: 20 });
    eventLoopDelay.enable();
    const eventLoopTimer = setInterval(() => {
        record("event_loop.delay_ms", eventLoopDelay.mean / 1_000_000);
        eventLoopDelay.reset();
    }, 10_000);
    eventLoopTimer.unref();
    ctx.capabilities
        .get<{
            registerShutdown(handler: () => Promise<void>): void;
        }>("system:lifecycle")
        ?.registerShutdown(async () => {
            clearInterval(eventLoopTimer);
            eventLoopDelay.disable();
        });

    ctx.routeRegistry.register(async (req, res, url) => {
        if (
            url.pathname !== "/api/v1/observability/client" ||
            req.method !== "POST"
        ) {
            return false;
        }
        let body = "";
        for await (const chunk of req) {
            body += chunk;
            if (body.length > 16_384) {
                res.writeHead(413, { "cache-control": "private, no-store" });
                res.end();
                return true;
            }
        }
        const payload = JSON.parse(body) as {
            metrics?: Array<{ name?: string; value?: number }>;
            navigation?: string;
        };
        for (const metric of payload.metrics ?? []) {
            record(String(metric.name), Number(metric.value), {
                navigation: payload.navigation === "spa" ? "spa" : "document",
            });
        }
        res.writeHead(204, { "cache-control": "private, no-store" });
        res.end();
        return true;
    }, "observability");
    ctx.routeRegistry.registerPrefix("/api/v1/observability", "observability");
    ctx.gatewayRegistry.register({
        id: "observability",
        name: "Observability Gateway",
        version: "1.0.0",
        required: true,
        description:
            "Vendor-neutral runtime and browser performance telemetry.",
        publisher: "Cognis Labs HQ",
    });
}
