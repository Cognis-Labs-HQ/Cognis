import type { FlowApi } from "@cognis/core";
import type { LibraryActor } from "../contracts.js";
import type { LibraryEntry, LibrarySchema, LibraryAsset } from "../types.js";
import { LibraryImageStore, validateReferenceImage } from "../image-store.js";
import { runOperation } from "../reuse/operation.js";

interface ImageContext {
    files?: LibraryImageStore;
    isReferenced(value: string): Promise<boolean>;
    flow?: FlowApi;
    schema(id: string): LibrarySchema;
    read(actor: LibraryActor, id: string): Promise<LibraryEntry | null>;
    readRequest(actor: LibraryActor, id: string): Promise<LibraryEntry | null>;
    asset(
        publisher: string,
        pack: string,
        version: string,
        path: string,
    ): Promise<LibraryAsset | null>;
    log?: (
        level: string,
        message: string,
        metadata: Record<string, unknown>,
    ) => unknown;
}

export class LibraryImages {
    constructor(private readonly context: ImageContext) {}

    async upload(
        actor: LibraryActor,
        mediaType: string,
        data: Uint8Array,
    ): Promise<{ value: string }> {
        const { log } = this.context;
        let result!: { value: string };
        await runOperation(
            this.context.flow,
            "study:library:uploadImage",
            { actor, mediaType },
            {
                authorize: () => {
                    if (!actor.accountId) throw new Error("forbidden");
                },
                validate: () => validateReferenceImage(mediaType, data),
                persist: async () => {
                    if (!this.context.files)
                        throw new Error("file_gateway_unavailable");
                    result = await this.context.files.upload(
                        actor,
                        mediaType,
                        data,
                    );
                    await log?.("info", "Study reference image uploaded.", {
                        component: "study-library",
                        operation: "uploadImage",
                        accountId: actor.accountId,
                    });
                },
            },
        );
        return result;
    }

    async discard(
        actor: LibraryActor,
        value: string,
    ): Promise<{ discarded: boolean }> {
        let discarded = false;
        const { log } = this.context;
        await runOperation(
            this.context.flow,
            "study:library:discardImage",
            { actor },
            {
                authorize: () => {
                    if (
                        typeof value !== "string" ||
                        !value.startsWith(
                            `file:uploads/${encodeURIComponent(actor.accountId)}/`,
                        )
                    )
                        throw new Error("forbidden");
                },
                discard: async () => {
                    if (await this.context.isReferenced(value)) return;
                    if (!this.context.files)
                        throw new Error("file_gateway_unavailable");
                    discarded = await this.context.files.discard(actor, value);
                    await log?.(
                        "info",
                        "Discarded staged Study reference image.",
                        {
                            component: "study-library",
                            operation: "discardImage",
                            accountId: actor.accountId,
                            discarded,
                        },
                    );
                },
            },
        );
        return { discarded };
    }

    async resolve(value: string): Promise<{ mediaType: string; data: Buffer }> {
        if (value.startsWith("file:")) {
            if (!this.context.files)
                throw new Error("file_gateway_unavailable");
            return this.context.files.read(value);
        }
        const match = value.match(
            /^\/api\/v1\/study\/library\/assets\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/,
        );
        if (!match) throw new Error("invalid_image_upload");
        const image = await this.context.asset(
            decodeURIComponent(match[1]),
            decodeURIComponent(match[2]),
            decodeURIComponent(match[3]),
            match[4].split("/").map(decodeURIComponent).join("/"),
        );
        if (!image) throw new Error("image_not_found");
        validateReferenceImage(image.mediaType, image.data);
        return image;
    }

    async validate(
        actor: LibraryActor,
        schema: LibrarySchema,
        layerId: string,
        fields: Record<string, unknown>,
        previous: Record<string, unknown> = {},
    ): Promise<void> {
        for (const field of schema.layers.find(({ id }) => id === layerId)
            ?.fields ?? []) {
            if (field.type !== "imageList") continue;
            for (const value of (fields[field.id] ?? []) as string[]) {
                if (((previous[field.id] ?? []) as string[]).includes(value))
                    continue;
                if (
                    value.startsWith("file:") &&
                    !["admin", "owner"].includes(actor.role) &&
                    !value.startsWith(
                        `file:uploads/${encodeURIComponent(actor.accountId)}/`,
                    )
                )
                    throw new Error("forbidden");
                await this.resolve(value);
            }
        }
    }

    async read(
        actor: LibraryActor,
        entryId: string,
        fieldId: string,
        index: number,
        staged = false,
    ): Promise<{ mediaType: string; data: Buffer }> {
        let image!: { mediaType: string; data: Buffer };
        await runOperation(
            this.context.flow,
            "study:library:readImage",
            { actor, entryId, fieldId, index, staged },
            {
                authorize: async () => {
                    const entry = await (staged
                        ? this.context.readRequest(actor, entryId)
                        : this.context.read(actor, entryId));
                    if (!entry) throw new Error("not_found");
                    const field = this.context
                        .schema(entry.schemaId)
                        .layers.find(({ id }) => id === entry.layer)
                        ?.fields?.find(({ id }) => id === fieldId);
                    const values = entry.fields?.[fieldId];
                    if (
                        field?.type !== "imageList" ||
                        !Array.isArray(values) ||
                        !Number.isSafeInteger(index) ||
                        index < 0 ||
                        typeof values[index] !== "string"
                    )
                        throw new Error("image_not_found");
                    image = await this.resolve(values[index]);
                },
            },
        );
        return image;
    }
}
