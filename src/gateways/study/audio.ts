import { createHash } from "node:crypto";
import type {
    FlowApi,
    StudyAudioCapability,
    StudyAudioInput,
    StudyAudioProvider,
    StudyAudioRecording,
} from "@cognis/core";

const ROLES = new Set([
    "atomicWritingUnit",
    "compoundWritingUnit",
    "lexicalUnit",
    "particle",
]);
const TYPES = new Set([
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "audio/webm",
    "audio/mp4",
]);

export class StudyAudio implements StudyAudioCapability {
    private readonly providers = new Map<
        string,
        {
            provider: StudyAudioProvider;
            controller: AbortController;
            keys: Set<string>;
        }
    >();
    private readonly pending = new Map<string, Promise<StudyAudioRecording>>();

    constructor(
        private readonly flow: FlowApi,
        private readonly log?: (
            level: string,
            message: string,
            metadata: Record<string, unknown>,
        ) => unknown,
    ) {}

    registerProvider(provider: StudyAudioProvider): () => void {
        if (
            !provider.id?.trim() ||
            !provider.revision?.trim() ||
            !provider.languages?.length ||
            typeof provider.fetchAudio !== "function" ||
            this.providers.has(provider.id) ||
            provider.languages.some((language) =>
                this.supports(language, "lexicalUnit"),
            )
        )
            throw new Error("audio_provider_conflict");
        const registration = {
            provider,
            controller: new AbortController(),
            keys: new Set<string>(),
        };
        this.providers.set(provider.id, registration);
        this.log?.("info", "Study audio provider registered.", {
            component: "study",
            operation: "registerAudioProvider",
            providerId: provider.id,
        });
        return () => {
            if (this.providers.get(provider.id) !== registration) return;
            registration.controller.abort();
            for (const key of registration.keys) this.pending.delete(key);
            registration.keys.clear();
            this.providers.delete(provider.id);
        };
    }

    supports(language: string, semanticRole: string): boolean {
        return (
            ROLES.has(semanticRole) &&
            [...this.providers.values()].some(({ provider }) =>
                provider.languages.includes(language),
            )
        );
    }

    private select(input: StudyAudioInput) {
        if (
            !input ||
            !this.supports(input.language, input.semanticRole) ||
            typeof input.label !== "string" ||
            !input.label.trim() ||
            [...input.label].length > 200 ||
            (input.readings !== undefined &&
                (!Array.isArray(input.readings) ||
                    input.readings.length > 10 ||
                    input.readings.some(
                        (reading) =>
                            typeof reading !== "string" ||
                            [...reading].length > 200,
                    )))
        )
            throw new Error("audio_lookup_unavailable");
        return [...this.providers.values()].find(({ provider }) =>
            provider.languages.includes(input.language),
        )!;
    }

    cacheKey(input: StudyAudioInput): string {
        const { provider } = this.select(input);
        return `lookups/${createHash("sha256")
            .update(
                JSON.stringify([
                    provider.id,
                    provider.revision,
                    input.language,
                    input.semanticRole,
                    input.label,
                    input.readings ?? [],
                ]),
            )
            .digest("hex")}.audio`;
    }

    async fetchAudio(input: StudyAudioInput): Promise<StudyAudioRecording> {
        const key = this.cacheKey(input);
        const existing = this.pending.get(key);
        if (existing) return existing;
        const registration = this.select(input);
        registration.keys.add(key);
        const promise = (async () => {
            let recording: StudyAudioRecording | undefined;
            const executed = new Set<string>();
            await this.flow.run("study:audio:fetch", input, {
                handlers: {
                    validate: () => {
                        this.select(input);
                        executed.add("validate");
                    },
                    fetch: async () => {
                        recording = await registration.provider.fetchAudio(
                            input,
                            registration.controller.signal,
                        );
                        registration.controller.signal.throwIfAborted();
                        if (
                            !recording ||
                            !TYPES.has(recording.mediaType) ||
                            !(recording.data instanceof Uint8Array) ||
                            !recording.data.byteLength ||
                            recording.data.byteLength > 2_000_000
                        )
                            throw new Error("invalid_audio_recording");
                        executed.add("fetch");
                    },
                },
            });
            if (!recording || executed.size !== 2)
                throw new Error("audio_flow_not_executed");
            this.log?.("info", "Study pronunciation audio fetched.", {
                component: "study",
                operation: "fetchAudio",
                providerId: registration.provider.id,
                language: input.language,
                bytes: recording.data.byteLength,
            });
            return recording;
        })()
            .catch((error) => {
                this.log?.(
                    "error",
                    "Study pronunciation audio retrieval failed.",
                    {
                        component: "study",
                        operation: "fetchAudio",
                        providerId: registration.provider.id,
                        language: input.language,
                        errorName:
                            error instanceof Error ? error.name : "Error",
                    },
                );
                throw error;
            })
            .finally(() => {
                if (this.pending.get(key) === promise) this.pending.delete(key);
                registration.keys.delete(key);
            });
        this.pending.set(key, promise);
        return promise;
    }

    dispose(): void {
        for (const registration of this.providers.values())
            registration.controller.abort();
        this.providers.clear();
        this.pending.clear();
    }
}
