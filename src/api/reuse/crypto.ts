/**
 * SHA-256 hash utility used across the API bootstrap and migration layers.
 *
 * @param content - UTF-8 string to hash.
 * @returns Lowercase hex-encoded SHA-256 digest.
 */

import { createHash } from "node:crypto";

export function sha256Of(content: string): string {
    return createHash("sha256").update(content, "utf8").digest("hex");
}
