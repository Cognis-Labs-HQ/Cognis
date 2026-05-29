import { randomBytes } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { DbTfaStore } from "./reuse/tfa-store.js";

export interface TfaConfigField {
    key: string;
    label: string;
    type: "text" | "password" | "number" | "boolean" | "select";
    required: boolean;
    envVar?: string;
    options?: string[];
}

export interface TfaMethodSetupView {
    prompt: string;
    fields?: Array<{
        key: string;
        label: string;
        type: "text" | "number" | "password";
        inputMode?: "numeric" | "text";
        maxLength?: number;
    }>;
    details?: Record<string, string>;
}

export interface TfaMethodAdapter {
    readonly id: string;
    readonly name: string;
    readonly defaultEnabled?: boolean;
    beginSetup(input: {
        accountId: string;
        displayName: string;
        issuer: string;
    }): Promise<{
        pendingPayload: Record<string, unknown>;
        view: TfaMethodSetupView;
    }>;
    verifySetup(input: {
        accountId: string;
        pendingPayload: Record<string, unknown>;
        verification: Record<string, unknown>;
    }): Promise<{
        verified: boolean;
        state?: Record<string, unknown>;
        message?: string;
    }>;
    verifyLogin(input: {
        accountId: string;
        state: Record<string, unknown>;
        payload: Record<string, unknown>;
    }): Promise<{ verified: boolean; message?: string }>;
    beginLoginChallenge?(input: {
        accountId: string;
        state: Record<string, unknown>;
    }): Promise<{ ready: boolean; message?: string }>;
    renderMethodDetails?(input: {
        accountId: string;
        state: Record<string, unknown>;
        issuer: string;
    }): Promise<{ details: Record<string, string> } | null>;
    getConfigSchema(): TfaConfigField[];
    configure(config: Record<string, unknown>): void;
}

export interface TfaAdapterInfo {
    id: string;
    name: string;
    enabled: boolean;
    locked?: boolean;
    syncedTo?: {
        gatewayId: string;
        adapterId?: string;
    };
    config: Record<string, unknown>;
    schema: TfaConfigField[];
}

export interface UserTfaMethod {
    id: string;
    name: string;
    enabled: boolean;
    configuredAt: string | null;
}

export interface UserTfaStatus {
    availableMethods: UserTfaMethod[];
    enabledMethods: UserTfaMethod[];
    preferredMethodIds: string[];
    hasConfiguredMethod: boolean;
    hasRecoveryCodes: boolean;
    enforcementRequired: boolean;
    requiresSetup: boolean;
    recoveryCodesTotal: number;
    recoveryCodesRemaining: number;
}

export interface UserRecoveryCodeStatus {
    id: string;
    label: string;
    used: boolean;
    usedAt: string | null;
}

export interface TfaLoginVerificationResult {
    verified: boolean;
    message?: string;
    usedRecoveryCode?: boolean;
    recoveryCodesRemaining?: number;
}

type NotifyDispatch = (envelope: {
    category: string;
    recipientUsername: string;
    subject: string;
    body: string;
    metadata?: Record<string, unknown>;
}) => Promise<unknown>;

const TFA_SETUP_ID_BYTES = 18;
const TFA_METHOD_ISSUER = process.env.COGNIS_TOTP_ISSUER || "Cognis";

export class CoreTfaGateway {
    private static readonly RECOVERY_CODE_LOW_THRESHOLD = 2;
    private readonly adapters = new Map<string, TfaMethodAdapter>();
    private readonly enabledAdapters = new Set<string>();
    private readonly adapterAvailabilityChecks = new Map<
        string,
        () => boolean
    >();
    private readonly adapterSyncTargets = new Map<
        string,
        {
            gatewayId: string;
            adapterId?: string;
        }
    >();

    constructor(
        private readonly store: DbTfaStore,
        private readonly options: {
            dispatchNotification?: NotifyDispatch;
            adapterFactoryContext?: Record<string, unknown>;
            log?: (
                level: string,
                message: string,
                metadata?: Record<string, unknown>,
            ) => void;
        } = {},
    ) {}

    registerAdapter(adapter: TfaMethodAdapter): void {
        this.adapters.set(adapter.id, adapter);
    }

    getAdapter(adapterId: string): TfaMethodAdapter | null {
        return this.adapters.get(adapterId) ?? null;
    }

    listAdapters(): TfaAdapterInfo[] {
        return Array.from(this.adapters.values()).map((adapter) => ({
            id: adapter.id,
            name: adapter.name,
            enabled: this.isAdapterEnabled(adapter.id),
            ...(this.adapterAvailabilityChecks.has(adapter.id)
                ? { locked: true }
                : {}),
            ...(this.adapterSyncTargets.has(adapter.id)
                ? { syncedTo: this.adapterSyncTargets.get(adapter.id) }
                : {}),
            config: {},
            schema: adapter.getConfigSchema(),
        }));
    }

    async loadPersistedConfigs(): Promise<void> {
        const configs = await this.store.listAdapterConfigs();
        const configuredIds = new Set(configs.map((entry) => entry.adapterId));
        for (const entry of configs) {
            const adapter = this.adapters.get(entry.adapterId);
            if (!adapter) continue;
            adapter.configure(entry.config);
            if (entry.enabled) {
                this.enabledAdapters.add(entry.adapterId);
            } else {
                this.enabledAdapters.delete(entry.adapterId);
            }
        }
        for (const [adapterId, adapter] of this.adapters.entries()) {
            if (
                !configuredIds.has(adapterId) &&
                adapter.defaultEnabled === true
            ) {
                this.enabledAdapters.add(adapterId);
            }
        }
    }

    async getAdapterConfig(
        adapterId: string,
    ): Promise<Record<string, unknown>> {
        const configs = await this.store.listAdapterConfigs();
        return (
            configs.find((entry) => entry.adapterId === adapterId)?.config ?? {}
        );
    }

    async saveAdapterConfig(
        adapterId: string,
        config: Record<string, unknown>,
    ): Promise<void> {
        const adapter = this.adapters.get(adapterId);
        if (!adapter) return;
        const enabledValue = config.enabled;
        const enabled =
            enabledValue === true ||
            enabledValue === "true" ||
            enabledValue === 1;
        const { enabled: _omit, ...adapterConfig } = config;
        adapter.configure(adapterConfig);
        if (enabled) {
            this.enabledAdapters.add(adapterId);
        } else {
            this.enabledAdapters.delete(adapterId);
        }
        await this.store.saveAdapterConfig(adapterId, enabled, adapterConfig);
    }

    async enableAdapter(adapterId: string): Promise<void> {
        const adapter = this.adapters.get(adapterId);
        if (!adapter) return;
        const existingConfig = await this.getAdapterConfig(adapterId);
        this.enabledAdapters.add(adapterId);
        await this.store.saveAdapterConfig(adapterId, true, existingConfig);
    }

    async disableAdapter(adapterId: string): Promise<void> {
        const adapter = this.adapters.get(adapterId);
        if (!adapter) return;
        const existingConfig = await this.getAdapterConfig(adapterId);
        this.enabledAdapters.delete(adapterId);
        await this.store.saveAdapterConfig(adapterId, false, existingConfig);
    }

    isAdapterEnabled(adapterId: string): boolean {
        const check = this.adapterAvailabilityChecks.get(adapterId);
        if (check) {
            return check();
        }
        return this.enabledAdapters.has(adapterId);
    }

    setAdapterAvailabilityCheck(adapterId: string, check: () => boolean): void {
        this.adapterAvailabilityChecks.set(adapterId, check);
    }

    setAdapterSyncTarget(
        adapterId: string,
        target: {
            gatewayId: string;
            adapterId?: string;
        },
    ): void {
        this.adapterSyncTargets.set(adapterId, target);
    }

    async getUserStatus(accountId: string): Promise<UserTfaStatus> {
        const userMethods = await this.store.listUserMethods(accountId);
        const enabledMethods = userMethods
            .filter((method) => method.enabled)
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((method) => ({
                id: method.methodId,
                name:
                    this.adapters.get(method.methodId)?.name ?? method.methodId,
                enabled: true,
                configuredAt: method.configuredAt,
            }));

        const enabledMethodIds = new Set(
            enabledMethods.map((method) => method.id),
        );

        const availableMethods = Array.from(this.adapters.values())
            .filter((adapter) => this.isAdapterEnabled(adapter.id))
            .map((adapter) => ({
                id: adapter.id,
                name: adapter.name,
                enabled: enabledMethodIds.has(adapter.id),
                configuredAt:
                    userMethods.find((method) => method.methodId === adapter.id)
                        ?.configuredAt ?? null,
            }));

        const hasRecoveryCodes =
            await this.store.hasUnusedRecoveryCodes(accountId);
        const recoveryCodes = await this.store.listRecoveryCodes(accountId);
        const recoveryCodesRemaining = recoveryCodes.filter(
            (entry) => entry.usedAt == null,
        ).length;
        const enforcementRequired = await this.store.getEnforceAllUsers();
        const hasConfiguredMethod = enabledMethods.length > 0;

        return {
            availableMethods,
            enabledMethods,
            preferredMethodIds: enabledMethods.map((method) => method.id),
            hasConfiguredMethod,
            hasRecoveryCodes,
            enforcementRequired,
            requiresSetup: enforcementRequired && !hasConfiguredMethod,
            recoveryCodesTotal: recoveryCodes.length,
            recoveryCodesRemaining,
        };
    }

    async beginMethodSetup(input: {
        accountId: string;
        displayName: string;
        methodId: string;
    }): Promise<{
        setupId: string;
        methodId: string;
        methodName: string;
        view: TfaMethodSetupView;
    }> {
        await this.store.pruneExpiredPendingSetups();
        const adapter = this.adapters.get(input.methodId);
        if (!adapter || !this.isAdapterEnabled(input.methodId)) {
            throw new Error("tfa_method_unavailable");
        }

        const setupId = `tfa_setup_${randomBytes(TFA_SETUP_ID_BYTES).toString("base64url")}`;
        const started = await adapter.beginSetup({
            accountId: input.accountId,
            displayName: input.displayName,
            issuer: TFA_METHOD_ISSUER,
        });
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        await this.store.savePendingSetup({
            setupId,
            accountId: input.accountId,
            methodId: input.methodId,
            payload: started.pendingPayload,
            expiresAt,
        });

        return {
            setupId,
            methodId: adapter.id,
            methodName: adapter.name,
            view: started.view,
        };
    }

    async verifyMethodSetup(input: {
        accountId: string;
        setupId: string;
        verification: Record<string, unknown>;
    }): Promise<{ verified: boolean; message?: string }> {
        const pending = await this.store.getPendingSetup(input.setupId);
        if (!pending || pending.accountId !== input.accountId) {
            return { verified: false, message: "setup_not_found" };
        }
        const expiresAt = Date.parse(pending.expiresAt);
        if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
            await this.store.deletePendingSetup(input.setupId);
            return { verified: false, message: "setup_expired" };
        }

        const adapter = this.adapters.get(pending.methodId);
        if (!adapter || !this.isAdapterEnabled(pending.methodId)) {
            await this.store.deletePendingSetup(input.setupId);
            return { verified: false, message: "tfa_method_unavailable" };
        }

        const result = await adapter.verifySetup({
            accountId: input.accountId,
            pendingPayload: pending.payload,
            verification: input.verification,
        });

        if (!result.verified || !result.state) {
            return {
                verified: false,
                message: result.message || "verification_failed",
            };
        }

        const nextSortOrder = await this.store.getNextSortOrder(
            input.accountId,
        );
        await this.store.upsertUserMethod({
            accountId: input.accountId,
            methodId: pending.methodId,
            enabled: true,
            sortOrder: nextSortOrder,
            state: result.state,
            configuredAt: new Date().toISOString(),
        });
        await this.store.deletePendingSetup(input.setupId);
        return { verified: true };
    }

    async cancelMethodSetup(accountId: string, setupId: string): Promise<void> {
        const pending = await this.store.getPendingSetup(setupId);
        if (!pending || pending.accountId !== accountId) return;
        await this.store.deletePendingSetup(setupId);
    }

    async disableMethod(accountId: string, methodId: string): Promise<void> {
        const methods = await this.store.listUserMethods(accountId);
        const existing = methods.find((method) => method.methodId === methodId);
        if (!existing) return;
        await this.store.upsertUserMethod({
            accountId,
            methodId,
            enabled: false,
            sortOrder: existing.sortOrder,
            state: existing.state,
            configuredAt: existing.configuredAt,
        });
    }

    async enableMethod(accountId: string, methodId: string): Promise<boolean> {
        const methods = await this.store.listUserMethods(accountId);
        const existing = methods.find((method) => method.methodId === methodId);
        if (!existing) return false;
        const adapter = this.adapters.get(methodId);
        if (!adapter || !this.isAdapterEnabled(methodId)) {
            return false;
        }
        await this.store.upsertUserMethod({
            accountId,
            methodId,
            enabled: true,
            sortOrder: existing.sortOrder,
            state: existing.state,
            configuredAt: existing.configuredAt,
        });
        return true;
    }

    async getMethodDetails(
        accountId: string,
        methodId: string,
    ): Promise<{ details: Record<string, string> } | null> {
        const methods = await this.store.listUserMethods(accountId);
        const existing = methods.find((method) => method.methodId === methodId);
        if (!existing) return null;
        const adapter = this.adapters.get(methodId);
        if (
            !adapter ||
            !this.isAdapterEnabled(methodId) ||
            typeof adapter.renderMethodDetails !== "function"
        ) {
            return null;
        }
        return (
            (await adapter.renderMethodDetails({
                accountId,
                state: existing.state,
                issuer: TFA_METHOD_ISSUER,
            })) ?? null
        );
    }

    async setPreferredMethods(
        accountId: string,
        methodIds: string[],
    ): Promise<void> {
        await this.store.setPreferredOrder(accountId, methodIds);
    }

    async generateRecoveryCodes(
        accountId: string,
        count = 8,
    ): Promise<string[]> {
        const codes = Array.from({ length: count }, () => {
            const bytes = randomBytes(4).toString("hex").toUpperCase();
            return `${bytes.slice(0, 4)}-${bytes.slice(4, 8)}`;
        });
        await this.store.replaceRecoveryCodes(accountId, codes);
        return codes;
    }

    async hasRecoveryCodes(accountId: string): Promise<boolean> {
        return this.store.hasUnusedRecoveryCodes(accountId);
    }

    async getRecoveryCodesStatus(accountId: string): Promise<{
        codes: UserRecoveryCodeStatus[];
        totalCount: number;
        usedCount: number;
        remainingCount: number;
        lowThreshold: number;
    }> {
        const records = await this.store.listRecoveryCodes(accountId);
        const codes = records.map((record, index) => ({
            id: record.codeHash.slice(0, 8),
            label: String(index + 1),
            used: record.usedAt != null,
            usedAt: record.usedAt,
        }));
        const remainingCount = codes.filter((entry) => !entry.used).length;
        const usedCount = codes.length - remainingCount;
        return {
            codes,
            totalCount: codes.length,
            usedCount,
            remainingCount,
            lowThreshold: CoreTfaGateway.RECOVERY_CODE_LOW_THRESHOLD,
        };
    }

    async verifyLogin(
        accountId: string,
        methodId: string,
        payload: Record<string, unknown>,
    ): Promise<TfaLoginVerificationResult> {
        if (methodId === "recovery_code") {
            const recoveryCode = String(payload.code ?? "").trim();
            if (!recoveryCode) {
                return { verified: false, message: "recovery_code_required" };
            }
            const valid = await this.store.consumeRecoveryCode(
                accountId,
                recoveryCode,
            );
            if (valid) {
                await this.notifyLowRecoveryCodeCount(accountId);
                const recoveryCodesRemaining =
                    await this.store.countUnusedRecoveryCodes(accountId);
                return {
                    verified: true,
                    usedRecoveryCode: true,
                    recoveryCodesRemaining,
                };
            }
            return { verified: false, message: "invalid_recovery_code" };
        }

        const methods = await this.store.listUserMethods(accountId);
        const configuredMethod = methods.find(
            (method) => method.methodId === methodId && method.enabled,
        );
        if (!configuredMethod) {
            return { verified: false, message: "method_not_configured" };
        }

        const adapter = this.adapters.get(methodId);
        if (!adapter || !this.isAdapterEnabled(methodId)) {
            return { verified: false, message: "tfa_method_unavailable" };
        }

        return adapter.verifyLogin({
            accountId,
            state: configuredMethod.state,
            payload,
        });
    }

    async getLoginMethods(
        accountId: string,
    ): Promise<Array<{ id: string; name: string }>> {
        const configuredMethods = await this.store.listUserMethods(accountId);
        const enabledConfiguredMethods = configuredMethods
            .filter((method) => method.enabled)
            .sort((left, right) => left.sortOrder - right.sortOrder);
        const resolvedMethods = await Promise.all(
            enabledConfiguredMethods.map(async (method) => {
                const adapter = this.adapters.get(method.methodId);
                if (!adapter || !this.isAdapterEnabled(method.methodId)) {
                    return null;
                }
                if (typeof adapter.beginLoginChallenge === "function") {
                    try {
                        const challenge = await adapter.beginLoginChallenge({
                            accountId,
                            state: method.state,
                        });
                        if (!challenge.ready) {
                            return null;
                        }
                    } catch (error) {
                        this.options.log?.(
                            "error",
                            "Failed to prepare TFA login challenge.",
                            {
                                component: "tfa-gateway",
                                operation: "prepare_login_challenge",
                                accountId,
                                methodId: method.methodId,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : String(error),
                            },
                        );
                        return null;
                    }
                }
                return {
                    id: adapter.id,
                    name: adapter.name,
                };
            }),
        );
        const methods = resolvedMethods.filter(
            (method): method is { id: string; name: string } => method != null,
        );
        if (await this.store.hasUnusedRecoveryCodes(accountId)) {
            methods.push({ id: "recovery_code", name: "Recovery Code" });
        }
        return methods;
    }

    async isSecondFactorEnabled(accountId: string): Promise<boolean> {
        const status = await this.getUserStatus(accountId);
        return status.enabledMethods.length > 0;
    }

    async isSetupRequired(accountId: string): Promise<boolean> {
        const status = await this.getUserStatus(accountId);
        return status.requiresSetup;
    }

    async resetUser(accountId: string): Promise<void> {
        await this.store.clearUserState(accountId);
    }

    async getEnforceAllUsers(): Promise<boolean> {
        return this.store.getEnforceAllUsers();
    }

    async setEnforceAllUsers(required: boolean): Promise<void> {
        await this.store.setEnforceAllUsers(required);
    }

    private async notifyLowRecoveryCodeCount(accountId: string): Promise<void> {
        const dispatchNotification = this.options.dispatchNotification;
        if (typeof dispatchNotification !== "function") {
            return;
        }
        const remainingCount =
            await this.store.countUnusedRecoveryCodes(accountId);
        if (remainingCount > CoreTfaGateway.RECOVERY_CODE_LOW_THRESHOLD) {
            return;
        }
        try {
            await dispatchNotification({
                category: "security",
                recipientUsername: accountId,
                subject: "Recovery Codes Running Low",
                body: `You have ${remainingCount} recovery code(s) remaining. Generate a new set in Settings > Security.`,
                metadata: {
                    component: "tfa-gateway",
                    event: "recovery_codes_low",
                    remainingCount,
                },
            });
        } catch (error) {
            this.options.log?.(
                "error",
                "Failed to dispatch low recovery-code notification.",
                {
                    component: "tfa-gateway",
                    operation: "notify_low_recovery_codes",
                    accountId,
                    remainingCount,
                    error:
                        error instanceof Error ? error.message : String(error),
                },
            );
        }
    }

    async discoverAdapters(tfaAdaptersRoot: string): Promise<void> {
        let entries: string[];
        try {
            entries = await readdir(tfaAdaptersRoot);
        } catch {
            return;
        }

        for (const entry of entries) {
            const packagePath = path.join(
                tfaAdaptersRoot,
                entry,
                "package.json",
            );
            try {
                const packageRaw = await readFile(packagePath, "utf8");
                const packageJson = JSON.parse(packageRaw) as { main?: string };
                if (!packageJson.main) continue;
                const entryPath = path.resolve(
                    tfaAdaptersRoot,
                    entry,
                    packageJson.main,
                );
                const module = await import(`${entryPath}?t=${Date.now()}`);
                if (typeof module.createAdapter !== "function") continue;
                const adapter = module.createAdapter(
                    this.options.adapterFactoryContext ?? {},
                ) as TfaMethodAdapter;
                this.registerAdapter(adapter);
            } catch {
                // Skip broken adapters
            }
        }
    }
}
