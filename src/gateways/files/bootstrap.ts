import { LocalFileGateway } from "../../adapters/file/local/adapter.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { GatewayBootstrapContext } from "../shared.js";

/**
 * Standard gateway bootstrap entry point for local file storage. Reads the
 * MEDIA_LOCATION environment variable, creates a LocalFileGateway, and
 * contributes it to the capability store under the key "file:gateway". Core
 * reads that key when building the server — it has no knowledge of which
 * concrete implementation was contributed.
 *
 * This gateway is permanently enabled (required: true). The local file adapter
 * is the sole concrete implementation and is always loaded.
 *
 * Capabilities contributed:
 *   file:gateway  — the full FileStorageGateway instance
 *   file:write    — (filePath, content) => Promise<void> helper
 *   file:read     — (filePath) => Promise<Buffer | null> helper
 */
export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const mediaLocation = process.env.MEDIA_LOCATION ?? "/app/media";
    const fileStorePath = `${mediaLocation}/uploads`;
    const fileGateway = new LocalFileGateway(fileStorePath);

    ctx.capabilities.contribute("file:gateway", fileGateway);

    ctx.capabilities.contribute(
        "file:write",
        async (
            filePath: string,
            content: string | Uint8Array,
        ): Promise<void> => {
            await mkdir(path.dirname(filePath), { recursive: true });
            await writeFile(filePath, content);
        },
    );

    ctx.capabilities.contribute(
        "file:read",
        async (filePath: string): Promise<Buffer | null> => {
            try {
                return await readFile(filePath);
            } catch {
                return null;
            }
        },
    );

    ctx.gatewayRegistry.register({
        id: "files",
        name: "File Storage Gateway",
        version: "1.0.0",
        required: true,
        description:
            "Provides local file storage for uploads and application logging.",
        publisher: "Cognis Labs",
    });
}
