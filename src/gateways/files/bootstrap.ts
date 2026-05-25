import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { GatewayBootstrapContext } from "../shared.js";

interface FileGatewayLike {
    store(
        userId: string,
        content: Uint8Array,
        contentType?: string,
    ): Promise<{
        key: string;
        size: number;
        contentType?: string;
        lastModified: Date;
    }>;
    put(
        key: string,
        content: Uint8Array,
        contentType?: string,
    ): Promise<{
        key: string;
        size: number;
        contentType?: string;
        lastModified: Date;
    }>;
    get(key: string): Promise<Uint8Array | null>;
    delete(key: string): Promise<boolean>;
    list(prefix?: string): Promise<
        Array<{
            key: string;
            size: number;
            contentType?: string;
            lastModified: Date;
        }>
    >;
}

async function loadLocalFileGateway(
    fileStorePath: string,
): Promise<FileGatewayLike> {
    const localAdapterPath = path.resolve(
        process.cwd(),
        "src",
        "adapters",
        "file",
        "local",
        "adapter.ts",
    );
    const localAdapterModule = await import(
        `${localAdapterPath}?t=${Date.now()}`
    );
    const LocalAdapterGatewayClass = localAdapterModule.LocalFileGateway as
        | (new (rootPath: string) => FileGatewayLike)
        | undefined;
    if (!LocalAdapterGatewayClass) {
        throw new Error("local_file_adapter_missing_gateway_class");
    }
    return new LocalAdapterGatewayClass(fileStorePath);
}

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
 *   file:write    — (filePath, content) => Promise<void> helper (overwrites)
 *   file:read     — (filePath) => Promise<Buffer | null> helper
 *   file:append   — (filePath, content) => Promise<void> helper (appends)
 */
export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const mediaLocation = process.env.MEDIA_LOCATION ?? "/app/media";
    const fileStorePath = `${mediaLocation}/uploads`;
    const fileGateway = await loadLocalFileGateway(fileStorePath);

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

    ctx.capabilities.contribute(
        "file:append",
        async (filePath: string, content: string): Promise<void> => {
            await mkdir(path.dirname(filePath), { recursive: true });
            await appendFile(filePath, content, "utf8");
        },
    );

    ctx.gatewayRegistry.register({
        id: "files",
        name: "File Storage Gateway",
        version: "1.1.0",
        required: true,
        description:
            "Provides local file storage for uploads and application logging.",
        publisher: "Cognis Labs HQ",
    });
}
