import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import path from "node:path";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const REDIRECT_LIMIT = 4;
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

export class LibraryAudioCache {
    private readonly pending = new Map<
        string,
        Promise<{ mediaType: string; data: Buffer }>
    >();

    constructor(
        private readonly root = process.env.COGNIS_LIBRARY_AUDIO_CACHE_DIR ??
            path.join(process.cwd(), ".cognis-data", "study-library-audio"),
        private readonly fetcher: typeof fetch = fetch,
        private readonly resolveHost: (
            hostname: string,
        ) => Promise<string[]> = async (hostname) =>
            (await lookup(hostname, { all: true })).map(
                ({ address }) => address,
            ),
    ) {}

    async read(
        remoteUrl: string,
    ): Promise<{ mediaType: string; data: Buffer }> {
        const key = createHash("sha256").update(remoteUrl).digest("hex");
        const metadataFile = path.join(this.root, `${key}.json`);
        const audioFile = path.join(this.root, `${key}.audio`);
        try {
            const metadata = JSON.parse(await readFile(metadataFile, "utf8"));
            return {
                mediaType: metadata.mediaType,
                data: await readFile(audioFile),
            };
        } catch {
            // Continue at the DOWNLOAD_AND_CACHE block below.
        }
        const pending = this.pending.get(key);
        if (pending) return pending;
        const download = this.downloadAndCache(
            remoteUrl,
            key,
            metadataFile,
            audioFile,
        ).finally(() => this.pending.delete(key));
        this.pending.set(key, download);
        return download;
    }

    private async downloadAndCache(
        remoteUrl: string,
        key: string,
        metadataFile: string,
        audioFile: string,
    ): Promise<{ mediaType: string; data: Buffer }> {
        // DOWNLOAD_AND_CACHE
        await mkdir(this.root, { recursive: true });
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
        const declaredLength = Number(
            response.headers.get("content-length") ?? 0,
        );
        if (declaredLength > MAX_AUDIO_BYTES)
            throw new Error("audio_too_large");
        const data = Buffer.from(await response.arrayBuffer());
        if (!data.length || data.byteLength > MAX_AUDIO_BYTES)
            throw new Error("audio_too_large");
        const temporaryAudio = `${audioFile}.${process.pid}.${key.slice(0, 8)}.tmp`;
        const temporaryMetadata = `${metadataFile}.${process.pid}.${key.slice(0, 8)}.tmp`;
        await writeFile(temporaryAudio, data, { flag: "wx" });
        await writeFile(temporaryMetadata, JSON.stringify({ mediaType }), {
            flag: "wx",
        });
        await rename(temporaryAudio, audioFile);
        await rename(temporaryMetadata, metadataFile);
        return { mediaType, data };
    }
}
