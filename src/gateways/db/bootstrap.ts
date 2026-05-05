import type { GatewayBootstrapContext } from "../../api/gateway-bootstrap.js";

export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    ctx.gatewayRegistry.register({
        id: "db",
        name: "Database Gateway",
        version: "1.0.0",
        required: true,
        description:
            "Core relational database layer for persistent application data.",
        publisher: "Cognis Labs",
    });
}
