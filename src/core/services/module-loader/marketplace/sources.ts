import { randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { writeMarketplaceSnapshot } from "./persistence.js";
import type { Ctx } from "../../../ctx/index.js";
import type {
    SecretEncryption,
    SealedSecret,
} from "../../../contracts/secrets/cipher.js";
import type { ModuleSource, ModuleCredentialValidation } from "./index.js";

interface SourceRecord extends ModuleSource {
    sealedCredential?: { binding: string; value: SealedSecret };
}

export interface SourceCredentialChange {
    token?: string;
    clearCredential?: boolean;
}

type SourceMutation =
    | {
          action: "save";
          source: ModuleSource;
          credential: SourceCredentialChange;
      }
    | { action: "remove"; uuid: string };

/** Own one atomic source registry and concealed credentials shared by server administrators. */
export class ModuleSourceRegistry {
    private writes: Promise<unknown> = Promise.resolve();
    private readonly flowId = "modules:sources:write";

    constructor(
        private readonly filePath: string,
        private readonly ctx: Ctx,
        private readonly trusted: Readonly<ModuleSource>,
        private readonly validateCredential: (
            source: ModuleSource,
            token: string,
        ) => Promise<ModuleCredentialValidation>,
    ) {
        ctx.registerFlow({
            id: "modules:sources:read",
            stages: ["load", "present"],
        });
        ctx.flow.extend(
            "modules:sources:read",
            "load",
            { id: "marketplace:sourceRead" },
            async (stage) => {
                stage.data.records = await this.records();
            },
        );
        ctx.flow.extend(
            "modules:sources:read",
            "present",
            { id: "marketplace:sourcePresentation" },
            (stage) => {
                const records = stage.data.records as SourceRecord[];
                const trustedRecord =
                    records.find(
                        (record) => record.uuid === this.trusted.uuid,
                    ) ?? this.trusted;
                stage.data.sources = [
                    this.publicRecord(trustedRecord),
                    ...records
                        .filter((record) => record.uuid !== this.trusted.uuid)
                        .map((record) => this.publicRecord(record)),
                ];
            },
        );
        ctx.registerFlow({
            id: this.flowId,
            stages: ["validate", "persist", "after"],
        });
        ctx.flow.extend(
            this.flowId,
            "validate",
            { id: "marketplace:sourceValidation" },
            async (stage) => {
                const input = stage.input as SourceMutation;
                const records = await this.records();
                if (input.action === "remove") {
                    if (input.uuid === trusted.uuid)
                        throw new Error("trusted_module_source_readonly");
                    stage.data.records = records.filter(
                        (record) => record.uuid !== input.uuid,
                    );
                    return;
                }
                const source = this.normalize(input.source);
                const previous = records.find(
                    (record) => record.uuid === source.uuid,
                );
                if (
                    typeof input.credential.token !== "undefined" &&
                    typeof input.credential.token !== "string"
                )
                    throw new Error("invalid_module_source_credential");
                const token = input.credential.token?.trim() ?? "";
                if (token.length > 8192 || /[\r\n]/.test(token))
                    throw new Error("invalid_module_source_credential");
                if (
                    input.credential.clearCredential !== undefined &&
                    typeof input.credential.clearCredential !== "boolean"
                )
                    throw new Error("invalid_module_source_credential");
                const clear = input.credential.clearCredential === true;
                if (clear && token)
                    throw new Error("module_source_credential_conflict");
                const binding = this.binding(source);
                if (
                    previous?.sealedCredential &&
                    previous.sealedCredential.binding !== binding &&
                    !token &&
                    !clear
                )
                    throw new Error("module_source_credential_scope_changed");
                const sealedCredential = clear
                    ? undefined
                    : token
                      ? {
                            binding,
                            value: await this.cipher().seal(
                                this.scope(source),
                                token,
                            ),
                        }
                      : previous?.sealedCredential;
                if (source.scanPrivateRepos && !sealedCredential)
                    throw new Error("module_source_credential_required");
                if (
                    token ||
                    (source.scanPrivateRepos &&
                        previous?.scanPrivateRepos !== true)
                ) {
                    const value =
                        token || (await this.decrypt(source, sealedCredential));
                    const validation = await validateCredential(
                        source,
                        value ?? "",
                    );
                    if (!validation.valid)
                        throw new Error("module_source_credential_invalid");
                }
                const record = {
                    ...source,
                    revision: randomUUID(),
                    ...(sealedCredential ? { sealedCredential } : {}),
                };
                stage.data.records = [
                    ...records.filter((entry) => entry.uuid !== source.uuid),
                    record,
                ];
                stage.data.result = this.publicRecord(record);
            },
        );
        ctx.flow.extend(
            this.flowId,
            "persist",
            { id: "marketplace:sourcePersistence" },
            async (stage) => {
                await this.persist(stage.data.records as SourceRecord[]);
            },
        );
    }

    private cipher(): SecretEncryption {
        return this.ctx.requireCapability<SecretEncryption>(
            "secrets:encryption",
        );
    }

    private binding(source: ModuleSource): string {
        return createHash("sha256")
            .update(
                JSON.stringify([
                    source.provider,
                    source.baseUrl,
                    source.namespace,
                ]),
            )
            .digest("hex");
    }

    private scope(source: ModuleSource): string {
        return `moduleSources:${source.uuid}:${this.binding(source)}`;
    }

    private async decrypt(
        source: ModuleSource,
        credential: SourceRecord["sealedCredential"],
    ): Promise<string | undefined> {
        if (!credential) return undefined;
        if (credential.binding !== this.binding(source))
            throw new Error("module_source_credential_scope_changed");
        return this.cipher().open(this.scope(source), credential.value);
    }

    normalize(value: ModuleSource): ModuleSource {
        if (!value || typeof value.uuid !== "string")
            throw new Error("invalid_source_uuid");
        const uuid = value.uuid.toLowerCase();
        const source =
            uuid === this.trusted.uuid
                ? {
                      ...this.trusted,
                      scanPrivateRepos: value.scanPrivateRepos === true,
                  }
                : { ...value, uuid };
        let url: URL;
        let homepage: URL | undefined;
        try {
            url = new URL(source.baseUrl);
            homepage = source.homepage ? new URL(source.homepage) : undefined;
        } catch {
            throw new Error("invalid_module_source");
        }
        if (
            homepage &&
            (homepage.protocol !== "https:" ||
                homepage.username ||
                homepage.password)
        )
            throw new Error("invalid_module_source");
        if (
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                source.uuid,
            ) ||
            !["github", "gitlab"].includes(source.provider) ||
            url.protocol !== "https:" ||
            url.username ||
            url.password ||
            url.search ||
            url.hash ||
            typeof source.name !== "string" ||
            !source.name.trim() ||
            source.name.length > 200 ||
            typeof source.namespace !== "string" ||
            !/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(source.namespace) ||
            source.namespace
                .split("/")
                .some((part) => part === "." || part === "..") ||
            (source.scanPrivateRepos !== undefined &&
                typeof source.scanPrivateRepos !== "boolean")
        )
            throw new Error("invalid_module_source");
        return {
            uuid: source.uuid,
            name: source.name.trim(),
            provider: source.provider,
            namespace: source.namespace,
            baseUrl: url.toString().replace(/\/$/, ""),
            ...(source.homepage ? { homepage: source.homepage } : {}),
            scanPrivateRepos: source.scanPrivateRepos === true,
            trusted: source.uuid === this.trusted.uuid,
        };
    }

    private publicRecord(record: SourceRecord): ModuleSource {
        return {
            ...this.normalize(record),
            credentialConfigured: Boolean(record.sealedCredential),
            ...(record.revision ? { revision: record.revision } : {}),
        };
    }

    private async records(): Promise<SourceRecord[]> {
        try {
            const value: unknown = JSON.parse(
                await readFile(this.filePath, "utf8"),
            );
            if (!Array.isArray(value))
                throw new Error("invalid_module_source_store");
            return value as SourceRecord[];
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
            throw error;
        }
    }

    private async persist(records: SourceRecord[]): Promise<void> {
        await writeMarketplaceSnapshot(
            this.filePath,
            records.map((record) => ({
                ...this.normalize(record),
                ...(record.revision ? { revision: record.revision } : {}),
                ...(record.sealedCredential
                    ? { sealedCredential: record.sealedCredential }
                    : {}),
            })),
        );
    }

    async list(): Promise<ModuleSource[]> {
        return (await this.ctx.flow.run("modules:sources:read", {})).data
            .sources as ModuleSource[];
    }

    async token(
        uuid: string,
        expected?: ModuleSource,
    ): Promise<string | undefined> {
        const record = (await this.records()).find(
            (entry) => entry.uuid === uuid,
        );
        if (!record) return undefined;
        const source = this.normalize(record);
        if (
            expected &&
            this.binding(source) !== this.binding(this.normalize(expected))
        )
            throw new Error("module_source_credential_scope_changed");
        return this.decrypt(source, record.sealedCredential);
    }

    async mutate(input: SourceMutation): Promise<ModuleSource | undefined> {
        const update = this.writes.then(
            () => this.ctx.flow.run(this.flowId, input),
            () => this.ctx.flow.run(this.flowId, input),
        );
        this.writes = update.then(
            () => undefined,
            () => undefined,
        );
        return (await update).data.result as ModuleSource | undefined;
    }
}
