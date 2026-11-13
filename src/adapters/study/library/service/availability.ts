import type { Ctx } from "@cognis/core";
import type { LibrarySchema, LibraryContentPackReceipt } from "../types.js";

/** Keep retained content inaccessible whenever its live language provider is absent. */
export class ContentAvailability {
    private readonly packs = new Map<string, string>();

    constructor(
        private readonly available?: (schema: LibrarySchema) => boolean,
    ) {}

    allows(schema: LibrarySchema | null): boolean {
        return !this.available || Boolean(schema && this.available(schema));
    }

    rememberPack(receipt: LibraryContentPackReceipt): void {
        this.packs.set(
            JSON.stringify([receipt.publisher, receipt.packId]),
            receipt.schemaId,
        );
    }

    allowsPack(
        publisher: string,
        packId: string,
        schema: (id: string) => LibrarySchema | null,
    ): boolean {
        if (!this.available) return true;
        const id = this.packs.get(JSON.stringify([publisher, packId]));
        return Boolean(id && this.allows(schema(id)));
    }
}

/** Resolve module contributions from the public registry, not the adapter-local store. */
export function languageAvailability(getCapability: (id: string) => unknown) {
    return (schema: LibrarySchema): boolean => {
        if (!schema.language) return true;
        const key = `study:language:${schema.language}`;
        const system = getCapability("system:ctx") as
            Pick<Ctx, "getCapability"> | undefined;
        return Boolean(system ? system.getCapability(key) : getCapability(key));
    };
}
