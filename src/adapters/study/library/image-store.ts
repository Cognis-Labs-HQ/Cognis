import { randomUUID } from "node:crypto";
import type { NamespaceFileClient } from "@cognis/core";
import type { LibraryActor } from "./contracts.js";

export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
const ACTOR = { actorId: "study-library-images", role: "owner" };

export function validateReferenceImage(
    mediaType: string,
    data: Uint8Array,
): void {
    if (!data.byteLength || data.byteLength > MAX_IMAGE_UPLOAD_BYTES)
        throw new Error("image_upload_too_large");
    const bytes = Buffer.from(data);
    const valid =
        mediaType === "image/png"
            ? bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a"
            : mediaType === "image/jpeg"
              ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
              : mediaType === "image/webp"
                ? bytes.subarray(0, 4).toString() === "RIFF" &&
                  bytes.subarray(8, 12).toString() === "WEBP"
                : mediaType === "image/gif" &&
                  ["GIF87a", "GIF89a"].includes(
                      bytes.subarray(0, 6).toString(),
                  );
    if (!valid) throw new Error("unsupported_image_type");
}

export class LibraryImageStore {
    constructor(private readonly files: NamespaceFileClient) {}

    async upload(
        actor: LibraryActor,
        mediaType: string,
        data: Uint8Array,
    ): Promise<{ value: string }> {
        validateReferenceImage(mediaType, data);
        const key = `uploads/${encodeURIComponent(actor.accountId)}/${randomUUID()}.image`;
        await this.files.put(
            ACTOR,
            key,
            Buffer.concat([Buffer.from(`${mediaType}\n`), data]),
            { publicRead: false, contentType: "application/octet-stream" },
        );
        return { value: `file:${key}` };
    }

    async read(value: string): Promise<{ mediaType: string; data: Buffer }> {
        if (!/^file:uploads\/[^/]+\/[a-f0-9-]+\.image$/.test(value))
            throw new Error("invalid_image_upload");
        const stored = await this.files.get(ACTOR, value.slice(5));
        if (!stored) throw new Error("image_not_found");
        const bytes = Buffer.from(stored);
        const separator = bytes.indexOf(10);
        const mediaType = bytes.subarray(0, separator).toString();
        const data = bytes.subarray(separator + 1);
        validateReferenceImage(mediaType, data);
        return { mediaType, data };
    }
}
