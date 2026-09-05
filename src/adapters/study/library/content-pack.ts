import { createHash } from "node:crypto";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
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
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const LICENSE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-.+]*$/;

function canonicalJson(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
    if (value && typeof value === "object") {
        return `{${Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(
                ([key, item]) =>
                    `${JSON.stringify(key)}:${canonicalJson(item)}`,
            )
            .join(",")}}`;
    }
    return JSON.stringify(value);
}

async function readJson(file: string): Promise<unknown> {
    return JSON.parse(await readFile(file, "utf8"));
}

async function resolveInside(root: string, relative: string): Promise<string> {
    if (
        !relative ||
        path.isAbsolute(relative) ||
        relative.includes("\\") ||
        relative.split("/").some((segment) => segment === ".." || !segment)
    )
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
        !VERSION_PATTERN.test(manifest.version) ||
        !manifest.contentRevision?.trim() ||
        !manifest.schema?.trim() ||
        !manifest.content?.trim() ||
        !ID_PATTERN.test(manifest.namespace) ||
        !LICENSE_PATTERN.test(manifest.license?.id ?? "")
    ) {
        throw new Error("invalid_content_pack_manifest");
    }
    if (manifest.license.url) {
        const licenseUrl = new URL(manifest.license.url);
        if (licenseUrl.protocol !== "https:")
            throw new Error("invalid_license_url");
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
    if (schema.namespace !== manifest.namespace)
        throw new Error("schema_namespace_not_owned");
    const assetsRoot = manifest.assets
        ? await resolveInside(root, manifest.assets)
        : undefined;
    const layerIds = new Set(schema.layers.map(({ id }) => id));
    const records: LibraryContentPackPlan["records"] = [];
    const digest = createHash("sha256");
    digest.update(canonicalJson(manifest));
    digest.update(canonicalJson(schema));
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
            digest
                .update(layer.name)
                .update(file.name)
                .update(canonicalJson(JSON.parse(raw)));
            for (const record of parseRecords(JSON.parse(raw))) {
                records.push({ ...record, layer: layer.name });
            }
        }
    }
    await validateContentRecords(manifest, schema, records, digest, assetsRoot);
    return {
        root,
        manifest,
        schema,
        records,
        digest: digest.digest("hex"),
    };
}

async function validateContentRecords(
    manifest: LibraryContentPackManifest,
    schema: LibraryContentPackPlan["schema"],
    records: LibraryContentPackPlan["records"],
    digest: ReturnType<typeof createHash>,
    assetsRoot?: string,
): Promise<void> {
    const entries = new Map<string, LibraryEntry>();
    for (const record of records) {
        if (
            !ID_PATTERN.test(record.id) ||
            !record.id.startsWith(`${manifest.namespace}:`) ||
            !record.label?.trim()
        )
            throw new Error("invalid_content_record");
        const id = contentEntryId(manifest, record.id);
        if (entries.has(id)) throw new Error("duplicate_content_record");
        validateFields(schema, record.layer, record.fields ?? {});
        const layer = schema.layers.find(({ id }) => id === record.layer)!;
        for (const field of layer.fields ?? []) {
            const value = record.fields?.[field.id];
            if (field.type !== "asset" || value === undefined) continue;
            if (!assetsRoot || typeof value !== "string")
                throw new Error("invalid_asset_reference");
            const asset = await resolveInside(assetsRoot, value);
            if (!(await stat(asset)).isFile())
                throw new Error("asset_not_file");
            digest
                .update(record.id)
                .update(field.id)
                .update(value)
                .update(await readFile(asset));
        }
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
