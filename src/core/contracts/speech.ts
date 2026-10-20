export interface SpeechSynthesisInput {
    text: string;
    language?: string;
    voiceId?: string;
    phonemes?: string;
}

export interface SpeechSynthesisCapability {
    readonly revision: string;
    synthesize(
        input: SpeechSynthesisInput,
        signal?: AbortSignal,
    ): Promise<{
        mediaType: string;
        data: Uint8Array;
    }>;
}
