import { MethodSetups } from "./method-setups.js";
import {
    ChallengeLifetimes,
    assertLiveChallenge,
} from "./challenge-lifetimes.js";
import { discoverTfaAdapters } from "./adapter-discovery.js";
import type { BootstrapLog } from "../shared.js";
import type { CapabilityStore } from "@cognis/core";
import {
    bootstrapTfaAdapters,
    type TfaAdapterBootstrapContext,
} from "./adapter-bootstrap.js";
import { randomBytes } from "node:crypto";
import type { DbTfaStore } from "./reuse/tfa-store.js";

import type {
    TfaChallengeLifetime,
    TfaConfigField,
    TfaMethodSetupView,
    TfaLoginPresentation,
    TfaMethodAdapter,
} from "./contracts/method.js";
export type {
    TfaChallengeLifetime,
    TfaConfigField,
    TfaMethodSetupView,
    TfaLoginPresentation,
    TfaMethodAdapter,
} from "./contracts/method.js";

/**
 * Factory function signature that TFA adapter modules must export as `createAdapter`.
 *
 * The gateway calls this once at startup, passing an opaque `context` object assembled
 * from `CoreTfaGateway` options (`adapterFactoryContext`). Adapters may read
 * well-known keys from it (e.g. capability handles contributed by other gateways) but
 * must never require a specific shape — treat every key as optional.
 */
export type TfaAdapterFactory = (
    context: Record<string, unknown>,
) => TfaMethodAdapter;

export interface TfaAdapterInfo {
    stringsBaseUrl?: string;
    id: string;
    name: string;
    version?: string;
    publisher?: string;
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

export interface TfaLoginMethod {
    loginUi?: TfaLoginPresentation;
    stringsBaseUrl?: string;
    id: string;
    name: string;
    challenge?: {
        message?: string;
        retryAfterSeconds?: number;
        resendAvailableAt?: string;
        maxLength?: number;
        deliveryStatus?: "queued" | "sent";
    };
}

type NotifyDispatch = (envelope: {
    category: string;
    recipientUsername: string;
    subject: string;
    body: string;
    metadata?: Record<string, unknown>;
}) => Promise<unknown>;

const TFA_METHOD_ISSUER = "Cognis";

export class CoreTfaGateway {
    private static readonly RECOVERY_CODE_LOW_THRESHOLD = 2;
    private readonly adapters = new Map<string, TfaMethodAdapter>();
    private readonly enabledAdapters = new Set<string>();
    private readonly setups: MethodSetups;
    private readonly challengeLifetimes = new ChallengeLifetimes();
    private readonly explicitlyDisabledAdapters = new Set<string>();
    private readonly adapterEnabledStateProviders = new Map<
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
    private readonly adapterEnabledChangeListeners = new Map<
        string,
        (adapterId: string, enabled: boolean) => Promise<void> | void
    >();
    private readonly adapterConfigChangeListeners = new Map<
        string,
        (
            adapterId: string,
            config: Record<string, unknown>,
        ) => Promise<void> | void
    >();

    constructor(
        private readonly store: Pick<DbTfaStore, keyof DbTfaStore>,
        private readonly options: {
            dispatchNotification?: NotifyDispatch;
            adapterFactoryContext?: Record<string, unknown>;
            log?: BootstrapLog;
        } = {},
    ) {
        this.setups = new MethodSetups(
            store,
            (methodId) =>
                this.isAdapterEnabled(methodId)
                    ? (this.adapters.get(methodId) ?? null)
                    : null,
            options.log,
        );
    }

    private blockChallenges(accountId?: string, methodId?: string): () => void {
        const releaseLogin = this.challengeLifetimes.block(accountId, methodId);
        const releaseSetup = this.setups.block(accountId, methodId);
        return () => {
            releaseSetup();
            releaseLogin();
        };
    }

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
            ...(adapter.version ? { version: adapter.version } : {}),
            ...(adapter.publisher ? { publisher: adapter.publisher } : {}),
            enabled: this.isAdapterEnabled(adapter.id),
            ...(this.adapterEnabledStateProviders.has(adapter.id)
                ? { locked: true }
                : {}),
            ...(this.adapterSyncTargets.has(adapter.id)
                ? { syncedTo: this.adapterSyncTargets.get(adapter.id) }
                : {}),
            config: {},
            schema: adapter.getConfigSchema(),
            stringsBaseUrl: adapter.stringsBaseUrl,
        }));
    }

    async loadPersistedConfigs(): Promise<void> {
        const configs = await this.store.listAdapterConfigs();
        const configuredIds = new Set(configs.map((entry) => entry.adapterId));
        this.explicitlyDisabledAdapters.clear();
        for (const entry of configs) {
            if (entry.enabled)
                this.explicitlyDisabledAdapters.delete(entry.adapterId);
            else this.explicitlyDisabledAdapters.add(entry.adapterId);
            const adapter = this.adapters.get(entry.adapterId);
            if (!adapter) continue;
            adapter.configure?.(entry.config);
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
        const release = !enabled
            ? this.blockChallenges(undefined, adapterId)
            : undefined;
        try {
            if (!enabled)
                await this.setups.cancelMatching(undefined, adapterId);
            const { enabled: _omit, ...adapterConfig } = config;
            const wasEnabled = this.enabledAdapters.has(adapterId);
            adapter.configure?.(adapterConfig);
            await this.store.saveAdapterConfig(
                adapterId,
                enabled,
                adapterConfig,
            );
            if (enabled) {
                this.enabledAdapters.add(adapterId);
            } else {
                this.enabledAdapters.delete(adapterId);
            }
            if (enabled) this.explicitlyDisabledAdapters.delete(adapterId);
            else this.explicitlyDisabledAdapters.add(adapterId);
            await this.notifyAdapterConfigChange(adapterId, adapterConfig);
            if (wasEnabled !== enabled) {
                await this.notifyAdapterEnabledChange(adapterId, enabled);
            }
        } finally {
            release?.();
        }
    }

    async enableAdapter(adapterId: string): Promise<void> {
        const adapter = this.adapters.get(adapterId);
        if (!adapter) return;
        const wasEnabled = this.enabledAdapters.has(adapterId);
        const existingConfig = await this.getAdapterConfig(adapterId);
        await this.store.saveAdapterConfig(adapterId, true, existingConfig);
        this.enabledAdapters.add(adapterId);
        this.explicitlyDisabledAdapters.delete(adapterId);
        if (!wasEnabled) {
            await this.notifyAdapterEnabledChange(adapterId, true);
        }
    }

    async disableAdapter(adapterId: string): Promise<void> {
        const release = this.blockChallenges(undefined, adapterId);
        try {
            await this.setups.cancelMatching(undefined, adapterId);
            const adapter = this.adapters.get(adapterId);
            if (!adapter) return;
            const wasEnabled = this.enabledAdapters.has(adapterId);
            const existingConfig = await this.getAdapterConfig(adapterId);
            await this.store.saveAdapterConfig(
                adapterId,
                false,
                existingConfig,
            );
            this.enabledAdapters.delete(adapterId);
            this.explicitlyDisabledAdapters.add(adapterId);
            if (wasEnabled) {
                await this.notifyAdapterEnabledChange(adapterId, false);
            }
        } finally {
            release();
        }
    }

    isAdapterEnabled(adapterId: string): boolean {
        const check = this.adapterEnabledStateProviders.get(adapterId);
        if (check) {
            return check();
        }
        return this.enabledAdapters.has(adapterId);
    }

    setAdapterAvailabilityCheck(adapterId: string, check: () => boolean): void {
        this.adapterEnabledStateProviders.set(adapterId, check);
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

    onAdapterEnabledChange(
        listenerId: string,
        listener: (adapterId: string, enabled: boolean) => Promise<void> | void,
    ): () => void {
        this.adapterEnabledChangeListeners.set(listenerId, listener);
        return () => {
            if (this.adapterEnabledChangeListeners.get(listenerId) === listener)
                this.adapterEnabledChangeListeners.delete(listenerId);
        };
    }

    onAdapterConfigChange(
        listenerId: string,
        listener: (
            adapterId: string,
            config: Record<string, unknown>,
        ) => Promise<void> | void,
    ): void {
        this.adapterConfigChangeListeners.set(listenerId, listener);
    }

    private async notifyAdapterConfigChange(
        adapterId: string,
        config: Record<string, unknown>,
    ): Promise<void> {
        for (const listener of this.adapterConfigChangeListeners.values()) {
            await listener(adapterId, config);
        }
    }

    private async notifyAdapterEnabledChange(
        adapterId: string,
        enabled: boolean,
    ): Promise<void> {
        for (const listener of this.adapterEnabledChangeListeners.values()) {
            await listener(adapterId, enabled);
        }
    }

    async getUserStatus(accountId: string): Promise<UserTfaStatus> {
        const userMethods = await this.store.listUserMethods(accountId);
        const enabledMethods = userMethods
            .filter(
                (method) =>
                    method.enabled &&
                    this.adapters.has(method.methodId) &&
                    this.isAdapterEnabled(method.methodId),
            )
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
        const hasConfiguredMethod = userMethods.some(
            (method) =>
                method.enabled &&
                !this.explicitlyDisabledAdapters.has(method.methodId),
        );

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
    }) {
        return this.setups.begin(input);
    }

    async verifyMethodSetup(input: {
        accountId: string;
        setupId: string;
        verification: Record<string, unknown>;
    }) {
        return this.setups.verify(input);
    }

    async cancelMethodSetup(accountId: string, setupId: string): Promise<void> {
        await this.setups.cancel(accountId, setupId);
    }

    async disableMethod(accountId: string, methodId: string): Promise<void> {
        const release = this.blockChallenges(accountId, methodId);
        try {
            await this.setups.cancelMatching(accountId, methodId);
            const methods = await this.store.listUserMethods(accountId);
            const existing = methods.find(
                (method) => method.methodId === methodId,
            );
            if (!existing) return;
            await this.store.upsertUserMethod({
                accountId,
                methodId,
                enabled: false,
                sortOrder: existing.sortOrder,
                state: existing.state,
                configuredAt: existing.configuredAt,
            });
        } finally {
            release();
        }
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
        lifetime: TfaChallengeLifetime,
    ): Promise<TfaLoginVerificationResult> {
        assertLiveChallenge(lifetime);
        if (
            methodId !== "recovery_code" &&
            (!this.adapters.has(methodId) || !this.isAdapterEnabled(methodId))
        )
            return { verified: false, message: "tfa_method_unavailable" };
        const challengeLifetime = this.challengeLifetimes.acquire(
            accountId,
            methodId,
            lifetime,
        );
        if (methodId === "recovery_code") {
            const recoveryCode = String(payload.code ?? "").trim();
            if (!recoveryCode) {
                return { verified: false, message: "recovery_code_required" };
            }
            const valid = await this.store.consumeRecoveryCode(
                accountId,
                recoveryCode,
            );
            assertLiveChallenge(challengeLifetime);
            if (valid) {
                await this.notifyLowRecoveryCodeCount(accountId);
                const recoveryCodesRemaining =
                    await this.store.countUnusedRecoveryCodes(accountId);
                assertLiveChallenge(challengeLifetime);
                return {
                    verified: true,
                    usedRecoveryCode: true,
                    recoveryCodesRemaining,
                };
            }
            return { verified: false, message: "invalid_recovery_code" };
        }

        const methods = await this.store.listUserMethods(accountId);
        assertLiveChallenge(challengeLifetime);
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

        const result = await adapter.verifyLogin({
            lifetime: challengeLifetime,
            accountId,
            state: configuredMethod.state,
            payload,
        });
        assertLiveChallenge(challengeLifetime);
        return result;
    }

    private async prepareLoginChallenge(
        accountId: string,
        methodId: string,
        state: Record<string, unknown>,
        lifetime: TfaChallengeLifetime,
    ): Promise<{
        ready: boolean;
        message?: string;
        retryAfterSeconds?: number;
        resendAvailableAt?: string;
        maxLength?: number;
        deliveryStatus?: "queued" | "sent";
    }> {
        const adapter = this.adapters.get(methodId);
        if (!adapter || !this.isAdapterEnabled(methodId)) {
            return { ready: false, message: "tfa_method_unavailable" };
        }
        const challengeLifetime = this.challengeLifetimes.acquire(
            accountId,
            methodId,
            lifetime,
        );
        if (typeof adapter.beginLoginChallenge !== "function") {
            return { ready: true };
        }
        const result = await adapter.beginLoginChallenge({
            lifetime: challengeLifetime,
            accountId,
            state,
        });
        assertLiveChallenge(challengeLifetime);
        return result;
    }

    private buildLoginMethodChallengeMetadata(challenge: {
        message?: string;
        retryAfterSeconds?: number;
        resendAvailableAt?: string;
        maxLength?: number;
        deliveryStatus?: "queued" | "sent";
    }):
        | {
              message?: string;
              retryAfterSeconds?: number;
              resendAvailableAt?: string;
              maxLength?: number;
              deliveryStatus?: "queued" | "sent";
          }
        | undefined {
        const metadata: {
            message?: string;
            retryAfterSeconds?: number;
            resendAvailableAt?: string;
            maxLength?: number;
            deliveryStatus?: "queued" | "sent";
        } = {};
        if (challenge.deliveryStatus)
            metadata.deliveryStatus = challenge.deliveryStatus;
        if (challenge.message) {
            metadata.message = challenge.message;
        }
        if (challenge.retryAfterSeconds != null) {
            metadata.retryAfterSeconds = challenge.retryAfterSeconds;
        }
        if (challenge.resendAvailableAt) {
            metadata.resendAvailableAt = challenge.resendAvailableAt;
        }
        if (Number.isInteger(challenge.maxLength) && challenge.maxLength! > 0) {
            metadata.maxLength = challenge.maxLength;
        }
        return Object.keys(metadata).length > 0 ? metadata : undefined;
    }

    async beginLoginChallenge(
        accountId: string,
        methodId: string,
        lifetime: TfaChallengeLifetime,
    ): Promise<{
        ready: boolean;
        message?: string;
        retryAfterSeconds?: number;
        resendAvailableAt?: string;
        maxLength?: number;
        deliveryStatus?: "queued" | "sent";
    }> {
        if (!this.adapters.has(methodId) || !this.isAdapterEnabled(methodId))
            return { ready: false, message: "tfa_method_unavailable" };
        try {
            const challengeLifetime = this.challengeLifetimes.acquire(
                accountId,
                methodId,
                lifetime,
            );
            const methods = await this.store.listUserMethods(accountId);
            assertLiveChallenge(challengeLifetime);
            const configuredMethod = methods.find(
                (method) => method.methodId === methodId && method.enabled,
            );
            if (!configuredMethod)
                return { ready: false, message: "method_not_configured" };
            return await this.prepareLoginChallenge(
                accountId,
                methodId,
                configuredMethod.state,
                lifetime,
            );
        } catch (error) {
            this.options.log?.(
                "error",
                "Failed to prepare TFA login challenge.",
                {
                    component: "tfa-gateway",
                    operation: "prepare_login_challenge",
                    accountId,
                    methodId,
                    error:
                        error instanceof Error ? error.message : String(error),
                },
            );
            return { ready: false, message: "tfa_method_unavailable" };
        }
    }

    async getLoginMethods(
        accountId: string,
        lifetime: TfaChallengeLifetime,
    ): Promise<TfaLoginMethod[]> {
        const admission = this.challengeLifetimes.guard(accountId, lifetime);
        try {
            const configuredMethods =
                await this.store.listUserMethods(accountId);
            assertLiveChallenge(admission.lifetime);
            const enabledConfiguredMethods = configuredMethods
                .filter((method) => method.enabled)
                .sort((left, right) => left.sortOrder - right.sortOrder);
            const candidateMethods = enabledConfiguredMethods.filter(
                (method) => {
                    const adapter = this.adapters.get(method.methodId);
                    return (
                        adapter != null &&
                        this.isAdapterEnabled(method.methodId)
                    );
                },
            );
            const hasUnusedRecoveryCodes =
                await this.store.hasUnusedRecoveryCodes(accountId);
            assertLiveChallenge(admission.lifetime);
            const initiateChallenge =
                candidateMethods.length === 1 && !hasUnusedRecoveryCodes;
            const resolvedMethods = await Promise.all(
                candidateMethods.map(
                    async (method): Promise<TfaLoginMethod | null> => {
                        assertLiveChallenge(admission.lifetime);
                        const adapter = this.adapters.get(method.methodId)!;
                        if (!initiateChallenge) {
                            return {
                                id: adapter.id,
                                name: adapter.name,
                                loginUi: adapter.loginUi,
                                stringsBaseUrl: adapter.stringsBaseUrl,
                            };
                        }
                        try {
                            const challenge = await this.prepareLoginChallenge(
                                accountId,
                                method.methodId,
                                method.state,
                                lifetime,
                            );
                            if (!challenge.ready) {
                                return null;
                            }
                            return {
                                id: adapter.id,
                                name: adapter.name,
                                loginUi: adapter.loginUi,
                                stringsBaseUrl: adapter.stringsBaseUrl,
                                ...(this.buildLoginMethodChallengeMetadata(
                                    challenge,
                                )
                                    ? {
                                          challenge:
                                              this.buildLoginMethodChallengeMetadata(
                                                  challenge,
                                              ),
                                      }
                                    : {}),
                            };
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
                    },
                ),
            );
            assertLiveChallenge(admission.lifetime);
            const methods = resolvedMethods.filter(
                (method): method is TfaLoginMethod => method != null,
            );
            if (hasUnusedRecoveryCodes) {
                methods.push({
                    id: "recovery_code",
                    name: "Recovery Code",
                    loginUi: {
                        placeholderKey:
                            "ui.app.login.tfa.code_placeholder_recovery",
                    },
                });
            }
            return methods;
        } finally {
            admission.release();
        }
    }

    async isSecondFactorEnabled(accountId: string): Promise<boolean> {
        const status = await this.getUserStatus(accountId);
        return status.hasConfiguredMethod;
    }

    async isSetupRequired(accountId: string): Promise<boolean> {
        const status = await this.getUserStatus(accountId);
        return status.requiresSetup;
    }

    async disposeChallenges(): Promise<void> {
        const release = this.blockChallenges();
        try {
            await this.setups.cancelMatching();
        } finally {
            release();
        }
    }

    async resetUser(accountId: string): Promise<void> {
        const release = this.blockChallenges(accountId);
        try {
            await this.setups.cancelMatching(accountId);
            await this.store.clearUserState(accountId);
        } finally {
            release();
        }
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

    async bootstrapAdapters(capabilities: CapabilityStore): Promise<void> {
        await bootstrapTfaAdapters(this.adapters.values(), capabilities, this);
    }

    async discoverAdapters(tfaAdaptersRoot: string): Promise<void> {
        const adapters = await discoverTfaAdapters(
            tfaAdaptersRoot,
            this.options.adapterFactoryContext ?? {},
            this.options.log,
        );
        for (const adapter of adapters) this.registerAdapter(adapter);
    }
}

export type { TfaAdapterBootstrapContext } from "./adapter-bootstrap.js";
