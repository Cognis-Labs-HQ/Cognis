import { LocalFileGateway } from "../../../adapters/file-local/local-file-gateway.js";
import type { GatewayBootstrapContext } from "../../gateway-bootstrap.js";

/**
 * Standard gateway bootstrap entry point for local file storage. Reads the
 * MEDIA_LOCATION environment variable, creates a LocalFileGateway, and
 * contributes it to the capability store under the key "file:gateway". Core
 * reads that key when building the server — it has no knowledge of which
 * concrete implementation was contributed.
 */
export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const mediaLocation = process.env.MEDIA_LOCATION ?? "/app/media";
    const fileStorePath = `${mediaLocation}/uploads`;
    const fileGateway = new LocalFileGateway(fileStorePath);

    ctx.capabilities.contribute("file:gateway", fileGateway);

    ctx.gatewayRegistry.register({
        id: "files",
        name: "File Storage Gateway",
        version: "1.0.0",
        description: "Provides local file storage for uploads.",
        publisher: "Cognis Labs",
    });
}
