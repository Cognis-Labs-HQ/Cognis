import type { SpeechSynthesisCapability } from "../speech.js";

export interface StudyAudioInput {
    language: string;
    label: string;
    semanticRole: string;
    readings?: readonly string[];
}

export interface StudyAudioRecording {
    mediaType: string;
    data: Uint8Array;
}

export interface StudyAudioProvider {
    id: string;
    revision: string;
    languages: readonly string[];
    available?(): boolean;
    fetchAudio(
        input: StudyAudioInput,
        signal: AbortSignal,
    ): Promise<StudyAudioRecording>;
}

export interface StudyAudioCapability {
    registerLanguage(
        language: string,
        configuration: () => { voiceId?: string },
        speech: () => SpeechSynthesisCapability | undefined,
    ): () => void;
    registerProvider(provider: StudyAudioProvider): () => void;
    supports(language: string, semanticRole: string): boolean;
    cacheKey(input: StudyAudioInput): string;
    fetchAudio(input: StudyAudioInput): Promise<StudyAudioRecording>;
}
