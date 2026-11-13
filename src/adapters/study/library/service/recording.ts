import decodeAudio, { type AudioData } from "@audio/decode";

export interface AudioRecording {
    mediaType: string;
    data: Uint8Array;
}

const RATE = 24000;
const MAX_SAMPLES = RATE * 180;

async function decode(recording: AudioRecording) {
    if (
        ![
            "audio/mpeg",
            "audio/wav",
            "audio/ogg",
            "audio/webm",
            "audio/mp4",
        ].includes(recording.mediaType) ||
        !recording.data.length ||
        recording.data.length > 10_000_000
    )
        throw new Error("unsupported_audio_type");
    let decoded: AudioData;
    try {
        decoded = await decodeAudio(recording.data);
    } catch (error) {
        throw new Error("invalid_audio_recording", { cause: error });
    }
    const length = decoded.channelData?.[0]?.length ?? 0;
    if (
        !length ||
        ![1, 2].includes(decoded.channelData.length) ||
        !Number.isFinite(decoded.sampleRate) ||
        decoded.sampleRate < 8000 ||
        decoded.sampleRate > 192000 ||
        length / decoded.sampleRate > 180
    )
        throw new Error("invalid_audio_recording");
    const samples = new Float32Array(length);
    for (const channel of decoded.channelData) {
        if (channel.length !== length)
            throw new Error("invalid_audio_recording");
        for (let index = 0; index < samples.length; index++) {
            if (!Number.isFinite(channel[index]))
                throw new Error("invalid_audio_recording");
            samples[index] += channel[index] / decoded.channelData.length;
        }
    }
    return { samples, rate: decoded.sampleRate };
}

export function encodeWav(samples: Float32Array): AudioRecording {
    if (!samples.length || samples.length > MAX_SAMPLES)
        throw new Error("invalid_audio_recording");
    const bytes = Buffer.alloc(44 + samples.length * 2);
    bytes.write("RIFF", 0);
    bytes.writeUInt32LE(bytes.length - 8, 4);
    bytes.write("WAVEfmt ", 8);
    bytes.writeUInt32LE(16, 16);
    bytes.writeUInt16LE(1, 20);
    bytes.writeUInt16LE(1, 22);
    bytes.writeUInt32LE(RATE, 24);
    bytes.writeUInt32LE(RATE * 2, 28);
    bytes.writeUInt16LE(2, 32);
    bytes.writeUInt16LE(16, 34);
    bytes.write("data", 36);
    bytes.writeUInt32LE(samples.length * 2, 40);
    for (let index = 0; index < samples.length; index++)
        bytes.writeInt16LE(
            Math.round(Math.max(-1, Math.min(1, samples[index])) * 32767),
            44 + index * 2,
        );
    return { mediaType: "audio/wav", data: bytes };
}

/** One continuous recording avoids browser-element startup gaps between words. */
export async function composeRecording(
    segments: readonly { recording: AudioRecording; pauseMs: number }[],
): Promise<AudioRecording> {
    const parts: Float32Array[] = [new Float32Array(RATE * 0.2)];
    let length = parts[0].length;
    for (const segment of segments) {
        const { samples, rate } = await decode(segment.recording);
        let first = samples.findIndex((value) => Math.abs(value) > 0.002);
        if (first < 0) throw new Error("invalid_audio_recording");
        let last = samples.length - 1;
        while (last > first && Math.abs(samples[last]) <= 0.002) last--;
        first = Math.max(0, first - Math.round(rate * 0.035));
        last = Math.min(samples.length, last + Math.round(rate * 0.05));
        const speech = new Float32Array(
            Math.ceil(((last - first) * RATE) / rate),
        );
        let peak = 0;
        for (let index = 0; index < speech.length; index++) {
            const position = first + (index * rate) / RATE;
            const lower = Math.floor(position);
            const blend = position - lower;
            speech[index] =
                samples[lower] * (1 - blend) +
                (samples[Math.min(lower + 1, last - 1)] ?? 0) * blend;
            peak = Math.max(peak, Math.abs(speech[index]));
        }
        const gain = Math.min(2, 0.89 / peak);
        const fade = Math.min(Math.round(RATE * 0.005), speech.length / 2);
        for (let index = 0; index < speech.length; index++)
            speech[index] *=
                gain *
                Math.min(1, index / fade, (speech.length - index - 1) / fade);
        if (
            !Number.isFinite(segment.pauseMs) ||
            segment.pauseMs < 0 ||
            segment.pauseMs > 2000
        )
            throw new Error("invalid_audio_recording");
        const pause = new Float32Array(
            Math.round((RATE * segment.pauseMs) / 1000),
        );
        parts.push(speech, pause);
        length += speech.length + pause.length;
        if (length > MAX_SAMPLES) throw new Error("invalid_audio_recording");
    }
    parts.push(new Float32Array(RATE * 0.2));
    length += parts.at(-1)!.length;
    const result = new Float32Array(length);
    let offset = 0;
    for (const part of parts) {
        result.set(part, offset);
        offset += part.length;
    }
    return encodeWav(result);
}
