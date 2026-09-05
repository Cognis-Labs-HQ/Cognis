import { randomUUID } from "node:crypto";
import type {
    StoredObject,
    VirtualFolder,
    VirtualFileEntry,
} from "@cognis/core";
import type { NamespaceFileService } from "./namespace-file-service.js";

type Preference = { defaultProviderId: string };

/** Owns the virtual (non-provider-path) organization of a user's files. */
export class FileLibraryService {
    private readonly folders = new Map<string, VirtualFolder[]>();
    private readonly metadata = new Map<
        string,
        Map<string, Partial<VirtualFileEntry>>
    >();
    private readonly preferences = new Map<string, Preference>();

    constructor(
        private readonly files: NamespaceFileService,
        private readonly listTeacherClasses: (
            actorId: string,
        ) => Promise<Array<{ id: string; languageCode?: string }>>,
    ) {}

    private key(namespaceId: string, key: string): string {
        return `${namespaceId}\0${key}`;
    }

    async list(
        actorId: string,
        role: string | undefined,
        namespaceIds: string[],
    ) {
        const access = { actorId, role, callerComponent: "core" };
        const groups = await Promise.all(
            namespaceIds.map(async (namespaceId) => {
                const entries = await this.files.list(namespaceId, access);
                return entries.map((entry) =>
                    this.decorate(actorId, namespaceId, entry),
                );
            }),
        );
        return groups.flat();
    }

    private decorate(
        actorId: string,
        namespaceId: string,
        entry: StoredObject,
    ): VirtualFileEntry {
        const metadata = this.metadata
            .get(actorId)
            ?.get(this.key(namespaceId, entry.key));
        return {
            ...entry,
            namespaceId,
            providerId:
                metadata?.providerId ?? this.getDefaultProvider(actorId),
            folderId: metadata?.folderId ?? null,
            favorite: metadata?.favorite ?? false,
            lastOpenedAt: metadata?.lastOpenedAt ?? null,
        };
    }

    createFolder(
        actorId: string,
        input: { name: string; namespaceId: string; classId?: string },
    ): VirtualFolder {
        const folder = { id: randomUUID(), ...input };
        this.folders.set(actorId, [
            ...(this.folders.get(actorId) ?? []),
            folder,
        ]);
        return folder;
    }

    async listFolders(
        actorId: string,
        role?: string,
    ): Promise<VirtualFolder[]> {
        if (role === "teacher") {
            const classes = await this.listTeacherClasses(actorId);
            for (const classroom of classes) {
                const folders = this.folders.get(actorId) ?? [];
                if (
                    !folders.some((folder) => folder.classId === classroom.id)
                ) {
                    this.createFolder(actorId, {
                        name: classroom.languageCode
                            ? `${classroom.languageCode} · ${classroom.id}`
                            : classroom.id,
                        namespaceId: "classes",
                        classId: classroom.id,
                    });
                }
            }
        }
        return [...(this.folders.get(actorId) ?? [])];
    }

    updateEntry(
        actorId: string,
        namespaceId: string,
        key: string,
        patch: Partial<VirtualFileEntry>,
    ): void {
        const entries = this.metadata.get(actorId) ?? new Map();
        const id = this.key(namespaceId, key);
        entries.set(id, { ...(entries.get(id) ?? {}), ...patch });
        this.metadata.set(actorId, entries);
    }

    getDefaultProvider(actorId: string): string {
        return this.preferences.get(actorId)?.defaultProviderId ?? "local";
    }

    setDefaultProvider(actorId: string, providerId: string): void {
        this.preferences.set(actorId, { defaultProviderId: providerId });
    }
}
