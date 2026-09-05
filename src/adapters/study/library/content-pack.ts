import { createHash } from "node:crypto";
import { readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import {
    validateFields,
    validateLibrarySchema,
    validateReferences,
} from "./layers.js";
import type {
    LibraryContentPackManifest,
    LibraryContentPackPlan,
    LibraryContentRecord,
    LibraryEntry,
} from "./types.js";

const ID_PATTERN = /^[a-z0-9]+(?:[-_.:][a-z0-9]+)*$/i;

async function readJson(file: string): Promise<unknown> {
    return JSON.parse(await readFile(file, "utf8"));
}

async function resolveInside(root: string, relative: string): Promise<string> {
    if (path.isAbsolute(relative))
        throw new Error("pack_path_must_be_relative");
    const resolved = await realpath(path.resolve(root, relative));
    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`))
        throw new Error("pack_path_outside_root");
    return resolved;
}

function validateManifest(value: unknown): LibraryContentPackManifest {
    const manifest = value as LibraryContentPackManifest;
    if (
        !manifest ||
        !ID_PATTERN.test(manifest.id) ||
        !manifest.publisher?.trim() ||
        !manifest.version?.trim() ||
        !manifest.contentRevision?.trim() ||
        !manifest.schema?.trim() ||
        !manifest.content?.trim() ||
        !manifest.license?.id?.trim()
    ) {
        throw new Error("invalid_content_pack_manifest");
    }
    return manifest;
}

function parseRecords(value: unknown): LibraryContentRecord[] {
    const records = Array.isArray(value)
        ? value
        : (value as { records?: unknown })?.records;
    if (!Array.isArray(records)) throw new Error("invalid_content_file");
    return records as LibraryContentRecord[];
}

function externalKey(
    manifest: LibraryContentPackManifest,
    recordId: string,
): string {
    return `${manifest.publisher}:${manifest.id}:${manifest.version}:${recordId}`;
}

export function contentEntryId(
    manifest: LibraryContentPackManifest,
    recordId: string,
): string {
    return createHash("sha256")
        .update(externalKey(manifest, recordId))
        .digest("hex");
}

export async function inspectContentPack(
    inputRoot: string,
): Promise<LibraryContentPackPlan> {
    const root = await realpath(inputRoot);
    const manifest = validateManifest(
        await readJson(await resolveInside(root, "manifest.json")),
    );
    const schemaFile = await resolveInside(root, manifest.schema);
    const contentRoot = await resolveInside(root, manifest.content);
    const schema = validateLibrarySchema((await readJson(schemaFile)) as never);
    const layerIds = new Set(schema.layers.map(({ id }) => id));
    const records: LibraryContentPackPlan["records"] = [];
    const digest = createHash("sha256");
    digest.update(JSON.stringify(manifest));
    digest.update(JSON.stringify(schema));
    for (const layer of (await readdir(contentRoot, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .sort((left, right) => left.name.localeCompare(right.name))) {
        if (!layerIds.has(layer.name)) throw new Error("unknown_content_layer");
        const layerRoot = await resolveInside(contentRoot, layer.name);
        const files = (await readdir(layerRoot, { withFileTypes: true }))
            .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
            .sort((left, right) => left.name.localeCompare(right.name));
        for (const file of files) {
            const raw = await readFile(
                await resolveInside(layerRoot, file.name),
                "utf8",
            );
            digest.update(layer.name).update(file.name).update(raw);
            for (const record of parseRecords(JSON.parse(raw))) {
                records.push({ ...record, layer: layer.name });
            }
        }
    }
    validateContentRecords(manifest, schema, records);
    return {
        root,
        manifest,
        schema,
        records,
        digest: digest.digest("hex"),
    };
}

function validateContentRecords(
    manifest: LibraryContentPackManifest,
    schema: LibraryContentPackPlan["schema"],
    records: LibraryContentPackPlan["records"],
): void {
    const entries = new Map<string, LibraryEntry>();
    for (const record of records) {
        if (!ID_PATTERN.test(record.id) || !record.label?.trim())
            throw new Error("invalid_content_record");
        const id = contentEntryId(manifest, record.id);
        if (entries.has(id)) throw new Error("duplicate_content_record");
        validateFields(schema, record.layer, record.fields ?? {});
        entries.set(id, {
            ...record,
            id,
            schemaId: schema.id,
            schemaVersion: schema.version,
            language: schema.language,
            layer: record.layer,
            scope: "global",
            scopeId: "global",
            createdBy: `content-pack:${manifest.id}`,
            createdAt: "",
            updatedAt: "",
            references: [],
        });
    }
    for (const record of records) {
        const references = (record.references ?? []).map((reference) => ({
            ...reference,
            entryId: contentEntryId(manifest, reference.entryId),
        }));
        validateReferences(schema, record.layer, references, entries);
    }
}
