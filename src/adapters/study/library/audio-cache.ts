import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { NamespaceFileClient } from "@cognis/core";

const REDIRECT_LIMIT = 4;
const CACHE_ACTOR = { actorId: "study-library-audio-cache", role: "owner" };
const AUDIO_TYPES = new Set([
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "audio/webm",
    "audio/mp4",
]);

function isPrivateAddress(address: string): boolean {
    const mappedIpv4 = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (mappedIpv4) return isPrivateAddress(mappedIpv4[1]);
    if (
        address === "::1" ||
        address === "::" ||
        address.startsWith("fc") ||
        address.startsWith("fd")
    )
        return true;
    if (address.startsWith("fe80:")) return true;
    const parts = address.split(".").map(Number);
    if (parts.length !== 4) return false;
    return (
        parts[0] === 10 ||
        parts[0] === 127 ||
        parts[0] === 0 ||
        (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
        (parts[0] === 169 && parts[1] === 254) ||
        (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
        (parts[0] === 192 && parts[1] === 168) ||
        (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) ||
        parts[0] >= 224
    );
}

async function validateRemoteUrl(
    value: string,
    resolveHost: (hostname: string) => Promise<string[]>,
): Promise<URL> {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port)
        throw new Error("invalid_audio_url");
    const addresses = isIP(url.hostname)
        ? [url.hostname]
        : await resolveHost(url.hostname);
    if (!addresses.length || addresses.some(isPrivateAddress))
        throw new Error("invalid_audio_host");
    return url;
}

function encodeAudio(mediaType: string, data: Uint8Array): Uint8Array {
    const header = Buffer.from(`${JSON.stringify({ mediaType })}\n`, "utf8");
    return Buffer.concat([header, data]);
}

function decodeAudio(value: Uint8Array): { mediaType: string; data: Buffer } {
    const buffer = Buffer.from(value);
    const separator = buffer.indexOf(10);
    if (separator < 1) throw new Error("invalid_cached_audio");
    const metadata = JSON.parse(buffer.subarray(0, separator).toString("utf8"));
    if (!AUDIO_TYPES.has(metadata.mediaType))
        throw new Error("invalid_cached_audio");
    return {
        mediaType: metadata.mediaType,
        data: buffer.subarray(separator + 1),
    };
}

export class LibraryAudioCache {
    private readonly pending = new Map<
        string,
        Promise<{ mediaType: string; data: Buffer }>
    >();

    constructor(
        private readonly files: NamespaceFileClient,
        private readonly fetcher: typeof fetch = fetch,
        private readonly resolveHost: (
            hostname: string,
        ) => Promise<string[]> = async (hostname) =>
            (await lookup(hostname, { all: true })).map(
                ({ address }) => address,
            ),
    ) {}

    async store(
        key: string,
        mediaType: string,
        data: Uint8Array,
    ): Promise<void> {
        if (!AUDIO_TYPES.has(mediaType))
            throw new Error("unsupported_audio_type");
        await this.files.put(CACHE_ACTOR, key, encodeAudio(mediaType, data), {
            publicRead: true,
            contentType: mediaType,
        });
    }

    async readStored(
        key: string,
    ): Promise<{ mediaType: string; data: Buffer }> {
        const cached = await this.files.get(CACHE_ACTOR, key);
        if (!cached) throw new Error("audio_not_found");
        return decodeAudio(cached);
    }

    async read(
        remoteUrl: string,
    ): Promise<{ mediaType: string; data: Buffer }> {
        const key = `${createHash("sha256").update(remoteUrl).digest("hex")}.audio`;
        const cached = await this.files.get(CACHE_ACTOR, key);
        if (cached) return decodeAudio(cached);
        const pending = this.pending.get(key);
        if (pending) return pending;
        const download = this.downloadAndCache(remoteUrl, key).finally(() =>
            this.pending.delete(key),
        );
        this.pending.set(key, download);
        return download;
    }

    private async downloadAndCache(
        remoteUrl: string,
        key: string,
    ): Promise<{ mediaType: string; data: Buffer }> {
        let url = await validateRemoteUrl(remoteUrl, this.resolveHost);
        let response: Response | undefined;
        for (let redirect = 0; redirect <= REDIRECT_LIMIT; redirect += 1) {
            response = await this.fetcher(url, {
                redirect: "manual",
                signal: AbortSignal.timeout(15_000),
            });
            if (![301, 302, 303, 307, 308].includes(response.status)) break;
            const location = response.headers.get("location");
            if (!location || redirect === REDIRECT_LIMIT)
                throw new Error("audio_redirect_invalid");
            url = await validateRemoteUrl(
                new URL(location, url).href,
                this.resolveHost,
            );
        }
        if (!response?.ok) throw new Error("audio_download_failed");
        const mediaType = response.headers.get("content-type")?.split(";")[0];
        if (!mediaType || !AUDIO_TYPES.has(mediaType))
            throw new Error("unsupported_audio_type");
        const data = Buffer.from(await response.arrayBuffer());
        if (!data.length) throw new Error("audio_empty");
        await this.files.put(CACHE_ACTOR, key, encodeAudio(mediaType, data), {
            publicRead: true,
            contentType: mediaType,
        });
        return { mediaType, data };
    }
}
