import { createHash } from "node:crypto";
import { textChunks } from "../../../../gateways/reuse/text-chunks.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import type { LibraryAsset, LibraryContentPackPlan } from "../types.js";

const TABLE = "study_library_asset_chunks";

function identity(...parts: string[]): string {
    return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

export async function ensurePackAssets(database: DbExecutor): Promise<void> {
    await database.ensureTable({
        name: TABLE,
        columns: [
            { name: "asset_id", type: "text", notNull: true },
            { name: "position", type: "integer", notNull: true },
            { name: "pack_key", type: "text", notNull: true },
            { name: "media_type", type: "text", notNull: true },
            { name: "data_base64", type: "text", notNull: true },
        ],
        primaryKey: ["asset_id", "position"],
        indexes: [{ columns: ["pack_key"] }],
    });
}

/** The caller's pack-ingestion transaction owns replacement of metadata and bytes. */
export async function replacePackAssets(
    database: DbExecutor,
    { manifest, assets }: Pick<LibraryContentPackPlan, "manifest" | "assets">,
): Promise<void> {
    for (const asset of assets) {
        const assetId = identity(
            manifest.publisher,
            manifest.id,
            manifest.version,
            asset.path,
        );
        await database.executeCommand({
            option: "DELETE",
            table: TABLE,
            where: [{ column: "asset_id", value: assetId }],
        });
        let position = 0;
        for (const chunk of textChunks(asset.data, 60_000)) {
            await database.executeCommand({
                option: "INSERT",
                table: TABLE,
                values: {
                    asset_id: assetId,
                    position,
                    pack_key: identity(manifest.publisher, manifest.id),
                    media_type: asset.mediaType,
                    data_base64: chunk,
                },
            });
            position++;
        }
    }
}

export async function readPackAsset(
    database: DbExecutor,
    publisher: string,
    packId: string,
    version: string,
    assetPath: string,
): Promise<LibraryAsset | null> {
    const result = await database.executeCommand({
        option: "SELECT",
        table: TABLE,
        where: [
            {
                column: "asset_id",
                value: identity(publisher, packId, version, assetPath),
            },
        ],
        orderBy: [{ column: "position", direction: "ASC" }],
    });
    if (!result.rows?.length) return null;
    return {
        mediaType: String(
            result.rows[0].media_type,
        ) as LibraryAsset["mediaType"],
        data: Buffer.from(
            result.rows.map((row) => String(row.data_base64)).join(""),
            "base64",
        ),
    };
}

export async function forgetPackAssets(
    database: DbExecutor,
    publisher: string,
    packId: string,
): Promise<void> {
    await database.executeCommand({
        option: "DELETE",
        table: TABLE,
        where: [{ column: "pack_key", value: identity(publisher, packId) }],
    });
}
