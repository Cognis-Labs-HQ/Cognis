import { resolveExternalBaseUrl } from "../../../api/reuse/url-parts.js";
import {
    ShareTokenStore,
    generateSharePassword,
    isExpired,
    verifySharePassword,
    type ShareAccessControls,
    type ShareTokenRecord,
} from "./store.js";
import {
    GuestProfileStore,
    type GuestProfileRecord,
} from "./guest-profile-store.js";
import {
    ShareApprovalRequestStore,
    type ShareApprovalRequestRecord,
} from "./approval-request-store.js";
import { resolveQuickShareActions } from "./quick-share-actions.js";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export interface ShareMethodAdapter {
    id: string;
    name: string;
    description: string;
    nameKey: string;
    descriptionKey: string;
    pageModuleUrl: string;
    order?: number;
    version?: string;
    publisher?: string;
    locked?: boolean;
    delivery: "public" | "account";
    deliveryPage?: {
        id: string;
        pattern: string;
        document: string;
        scriptUrl: string;
        access?: { minRole: string };
    };
    prepare(input: {
        recipients?: unknown;
        accessControls?: Record<string, unknown>;
    }): { accessControls: Record<string, unknown> };
    validateUnique?(input: {
        accessControls: Partial<ShareAccessControls>;
        existingAccessControls: ShareAccessControls[];
    }): void;
}

export interface ShareVariant {
    id: string;
    label: string;
    url: string;
    contentType?: string;
    access?: "read" | "write";
}

export class CoreShareGateway {
    private readonly adapters = new Map<string, ShareMethodAdapter>();
    constructor(
        private readonly store: ShareTokenStore,
        private readonly guestProfileStore: GuestProfileStore,
        private readonly approvalRequestStore: ShareApprovalRequestStore,
        private readonly externalBaseUrl: string = resolveExternalBaseUrl(),
        private readonly resolveCapability: <T>(
            name: string,
        ) => T | undefined = () => undefined,
    ) {}

    getCapability<T>(name: string): T | undefined {
        return this.resolveCapability<T>(name);
    }

    async discoverAdapters(adaptersRoot: string): Promise<void> {
        let entries: string[];
        try {
            entries = await readdir(adaptersRoot);
        } catch {
            return;
        }
        for (const entry of entries.sort()) {
            try {
                const packageRoot = path.join(adaptersRoot, entry);
                const pkg = JSON.parse(
                    await readFile(
                        path.join(packageRoot, "package.json"),
                        "utf8",
                    ),
                ) as { main?: string; version?: string };
                if (!pkg.main) continue;
                const manifest = JSON.parse(
                    await readFile(
                        path.join(packageRoot, "manifest.json"),
                        "utf8",
                    ),
                ) as { locked?: boolean; publisher?: string };
                const module = await import(
                    path.resolve(packageRoot, pkg.main)
                );
                if (typeof module.createShareAdapter !== "function") continue;
                const adapter =
                    module.createShareAdapter() as ShareMethodAdapter;
                if (!adapter?.id || !adapter.name || !adapter.pageModuleUrl)
                    continue;
                this.adapters.set(adapter.id, {
                    ...adapter,
                    version: pkg.version,
                    publisher: manifest.publisher,
                    locked: manifest.locked === true,
                });
            } catch {
                // One unavailable sharing method must not disable the gateway.
            }
        }
    }

    listAdapters(): ShareMethodAdapter[] {
        return Array.from(this.adapters.values()).sort(
            (left, right) =>
                (left.order ?? 100) - (right.order ?? 100) ||
                left.name.localeCompare(right.name),
        );
    }

    getAdapter(adapterId: string): ShareMethodAdapter | null {
        return this.adapters.get(adapterId) ?? null;
    }

    resolveRecordAdapter(record: {
        metadata?: Record<string, string> | null;
    }): ShareMethodAdapter | null {
        return this.getAdapter(String(record.metadata?.adapterId ?? ""));
    }

    prepareAdapterShare(
        adapterId: string,
        input: {
            recipients?: unknown;
            accessControls?: Record<string, unknown>;
        },
    ): { accessControls: Record<string, unknown> } {
        const adapter = this.adapters.get(adapterId);
        if (!adapter) throw new Error("share_method_not_found");
        return adapter.prepare(input);
    }

    async ensureSchema(): Promise<void> {
        await this.store.ensureSchema();
        await this.guestProfileStore.ensureSchema();
        await this.approvalRequestStore.ensureSchema();
    }

    buildAbsoluteUrl(pathOrUrl: string): string {
        const normalizedPath = String(pathOrUrl ?? "").trim();
        if (!normalizedPath || /^[a-z][a-z0-9+.-]*:/i.test(normalizedPath)) {
            return normalizedPath;
        }
        return this.externalBaseUrl
            ? `${this.externalBaseUrl}${normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`}`
            : normalizedPath;
    }

    buildShareUrl(tokenValue: string): string {
        const encodedToken = encodeURIComponent(tokenValue);
        return this.buildAbsoluteUrl(`/share/${encodedToken}`);
    }

    isTokenExpired(record: Pick<ShareTokenRecord, "expiresAt">): boolean {
        return isExpired(record.expiresAt);
    }

    async serializeRecord(
        record: ShareTokenRecord,
    ): Promise<Record<string, unknown>> {
        const adapter = this.resolveRecordAdapter(record);
        const publicLink = adapter?.delivery === "public";
        const shareUrl = publicLink
            ? this.buildShareUrl(record.tokenValue)
            : "";
        const destinationUrl = publicLink
            ? shareUrl
            : this.buildAbsoluteUrl(String(record.metadata?.contentUrl ?? ""));
        const actionUrl = publicLink
            ? destinationUrl
            : this.buildAbsoluteUrl(
                  `/share/usr_${encodeURIComponent(record.id)}`,
              );
        const resolveVariants = this.resolveCapability<
            (input: {
                resourceType: string;
                resourceId: string;
                token: string;
                shareUrl: string;
                grantedCapabilities: string[];
                metadata: Record<string, string> | null;
            }) => Promise<ShareVariant[]> | ShareVariant[]
        >("share:resolveVariants");
        const resolvedVariants =
            publicLink && resolveVariants
                ? await resolveVariants({
                      resourceType: record.resourceType,
                      resourceId: record.resourceId,
                      token: record.tokenValue,
                      shareUrl,
                      grantedCapabilities: record.grantedCapabilities,
                      metadata: record.metadata,
                  })
                : [];
        const variants = resolvedVariants.map((variant) => ({
            ...variant,
            url: this.buildAbsoluteUrl(variant.url),
        }));
        const activityEvents = await this.store.listActivity(record.id);
        return {
            id: record.id,
            ownerAccountId: record.ownerAccountId,
            resourceType: record.resourceType,
            resourceId: record.resourceId,
            label: record.label,
            metadata: record.metadata,
            grantedCapabilities: record.grantedCapabilities,
            accessControls: record.accessControls,
            passwordProtected: Boolean(record.passwordHash),
            readonlyWatermark: record.accessControls.watermarkReadonly,
            expiresAt: record.expiresAt,
            status: this.isTokenExpired(record) ? "expired" : "active",
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            lastAccessedAt: record.lastAccessedAt,
            activityEvents,
            shareUrl,
            destinationUrl,
            actionUrl,
            shareMethod: adapter?.id ?? "link",
            variants,
            emailSupported:
                publicLink &&
                Boolean(this.resolveCapability("notify:sendEmail")),
            quickShareActions: publicLink
                ? await resolveQuickShareActions(this.resolveCapability, {
                      shareUrl,
                      label: record.label,
                  })
                : [],
        };
    }

    async issueToken(input: {
        ownerAccountId: string;
        resourceType: string;
        resourceId: string;
        metadata?: Record<string, string> | null;
        label?: string | null;
        grantedCapabilities?: string[];
        accessControls?: Partial<ShareAccessControls>;
        password?: string | null;
        generatePassword?: boolean;
        expiresAt?: string;
    }): Promise<Record<string, unknown>> {
        await this.validateAdapterUniqueness({
            ownerAccountId: input.ownerAccountId,
            adapterId: String(input.metadata?.adapterId ?? ""),
            resourceType: input.resourceType,
            resourceId: input.resourceId,
            accessControls: input.accessControls,
        });
        const generatedPassword = input.generatePassword
            ? generateSharePassword()
            : null;
        const record = await this.store.issue({
            ...input,
            password: input.password ?? generatedPassword,
        });
        return {
            ...(await this.serializeRecord(record)),
            generatedPassword,
        };
    }

    async updateToken(input: {
        shareId: string;
        ownerAccountId: string;
        label?: string | null;
        grantedCapabilities?: string[];
        accessControls?: Partial<ShareAccessControls>;
        password?: string | null;
        generatePassword?: boolean;
        clearPassword?: boolean;
        expiresAt?: string;
    }): Promise<Record<string, unknown> | null> {
        const existingRecord = await this.store.getById(input.shareId);
        if (
            !existingRecord ||
            existingRecord.ownerAccountId !== input.ownerAccountId
        ) {
            return null;
        }
        await this.validateAdapterUniqueness({
            ownerAccountId: input.ownerAccountId,
            adapterId: String(existingRecord.metadata?.adapterId ?? ""),
            resourceType: existingRecord.resourceType,
            resourceId: existingRecord.resourceId,
            accessControls:
                input.accessControls ?? existingRecord.accessControls,
            excludeShareId: existingRecord.id,
        });
        const generatedPassword = input.generatePassword
            ? generateSharePassword()
            : null;
        const {
            generatePassword: _generatePassword,
            password,
            ...changes
        } = input;
        const record = await this.store.updateById({
            ...changes,
            ...(generatedPassword
                ? { password: generatedPassword }
                : password !== undefined
                  ? { password }
                  : {}),
        });
        return record
            ? {
                  ...(await this.serializeRecord(record)),
                  generatedPassword,
              }
            : null;
    }

    async listTokens(filter: {
        ownerAccountId: string;
        resourceType?: string;
        resourceId?: string;
    }): Promise<Record<string, unknown>[]> {
        const records = await this.store.listByOwner(filter);
        return await Promise.all(
            records.map((record) => this.serializeRecord(record)),
        );
    }

    async listReceivedTokens(
        recipientAccountId: string,
    ): Promise<Record<string, unknown>[]> {
        const records = await this.store.listByRecipient(recipientAccountId);
        return Promise.all(
            records.map((record) => this.serializeRecord(record)),
        );
    }

    async claimExpiredNotifications(): Promise<ShareTokenRecord[]> {
        return this.store.claimExpiredNotifications();
    }

    async markExpirationNotificationSent(shareId: string): Promise<void> {
        await this.store.markExpirationNotificationSent(shareId);
    }

    async removeUserRecipient(input: {
        shareId: string;
        recipientAccountId: string;
    }): Promise<"updated" | "deleted" | "not_found"> {
        const record = await this.store.getById(input.shareId);
        if (!record) return "not_found";
        const recipients = record.accessControls.recipients;
        const nextRecipients = recipients.filter(
            (recipient) =>
                !(
                    recipient.type === "user" &&
                    recipient.id === input.recipientAccountId
                ),
        );
        if (nextRecipients.length === recipients.length) return "not_found";
        if (nextRecipients.length === 0) {
            await this.store.deleteById({ shareId: record.id });
            return "deleted";
        }
        await this.store.updateById({
            shareId: record.id,
            ownerAccountId: record.ownerAccountId,
            accessControls: {
                ...record.accessControls,
                recipients: nextRecipients,
            },
        });
        return "updated";
    }

    async deleteResourceShares(input: {
        ownerAccountId: string;
        resourceType: string;
        resourceId: string;
    }): Promise<number> {
        const records = await this.store.listByOwner(input);
        await Promise.all(
            records.map((record) =>
                this.store.deleteById({ shareId: record.id }),
            ),
        );
        return records.length;
    }

    private async validateAdapterUniqueness(input: {
        ownerAccountId: string;
        adapterId: string;
        resourceType: string;
        resourceId: string;
        accessControls?: Partial<ShareAccessControls>;
        excludeShareId?: string;
    }): Promise<void> {
        const existingRecords = await this.store.listByOwner({
            ownerAccountId: input.ownerAccountId,
            resourceType: input.resourceType,
            resourceId: input.resourceId,
        });
        const existingAccessControls = existingRecords
            .filter((record) => record.id !== input.excludeShareId)
            .filter((record) => !this.isTokenExpired(record))
            .map((record) => record.accessControls);
        this.getAdapter(input.adapterId)?.validateUnique?.({
            accessControls: input.accessControls ?? {},
            existingAccessControls,
        });
    }

    async listByResource(filter: {
        resourceType: string;
        resourceId: string;
    }): Promise<Record<string, unknown>[]> {
        const records = await this.store.listByResource(filter);
        return await Promise.all(
            records.map((record) => this.serializeRecord(record)),
        );
    }

    async resolveUserAccess(input: {
        accountId: string;
        resourceType: string;
        resourceId: string;
        requiredCapability: string;
    }): Promise<{ authorized: boolean; shareId?: string }> {
        const accountId = input.accountId.trim();
        if (!accountId || accountId.startsWith("share:")) {
            return { authorized: false };
        }
        const records = await this.store.listByResource({
            resourceType: input.resourceType,
            resourceId: input.resourceId,
        });
        for (const record of records) {
            const recipientAuthorized =
                !isExpired(record) &&
                record.grantedCapabilities.includes(input.requiredCapability) &&
                record.accessControls.recipients.some(
                    (recipient) =>
                        recipient.type === "user" && recipient.id === accountId,
                );
            if (!recipientAuthorized) continue;
            if (
                record.passwordHash &&
                !(await this.store.hasAccountUnlock(record.id, accountId))
            ) {
                continue;
            }
            return { authorized: true, shareId: record.id };
        }
        return { authorized: false };
    }

    async unlockUserAccess(input: {
        shareId: string;
        accountId: string;
        resourceType: string;
        resourceId: string;
        requiredCapability: string;
        password: string;
    }): Promise<boolean> {
        const record = await this.store.getById(input.shareId);
        if (!record || this.isTokenExpired(record)) return false;
        const adapter = this.resolveRecordAdapter(record);
        const accountId = input.accountId.trim();
        const recipientAuthorized = record.accessControls.recipients.some(
            (recipient) =>
                recipient.type === "user" && recipient.id === accountId,
        );
        if (
            adapter?.delivery !== "account" ||
            !recipientAuthorized ||
            record.resourceType !== input.resourceType ||
            record.resourceId !== input.resourceId ||
            !record.grantedCapabilities.includes(input.requiredCapability) ||
            !record.passwordHash ||
            !verifySharePassword(input.password, record.passwordHash)
        ) {
            return false;
        }
        await this.store.grantAccountUnlock(record.id, accountId);
        return true;
    }

    async resolveAccountShare(input: {
        shareId: string;
        accountId: string;
        password?: string | null;
    }): Promise<
        | { resolved: true; destinationUrl: string; passwordProtected: boolean }
        | { resolved: false; reason: string }
    > {
        const record = await this.store.getById(input.shareId);
        if (!record || this.isTokenExpired(record)) {
            return { resolved: false, reason: "not_found" };
        }
        const adapter = this.resolveRecordAdapter(record);
        const accountId = input.accountId.trim();
        const allowed =
            record.ownerAccountId === accountId ||
            record.accessControls.recipients.some(
                (recipient) =>
                    recipient.type === "user" && recipient.id === accountId,
            );
        if (adapter?.delivery !== "account" || !allowed) {
            return { resolved: false, reason: "forbidden" };
        }
        const ownerAuthorized = record.ownerAccountId === accountId;
        if (
            record.passwordHash &&
            !ownerAuthorized &&
            !verifySharePassword(
                String(input.password ?? ""),
                record.passwordHash,
            )
        ) {
            return { resolved: false, reason: "invalid_password" };
        }
        if (record.passwordHash && !ownerAuthorized) {
            await this.store.grantAccountUnlock(record.id, accountId);
        }
        const deliverUserShare = this.getCapability<
            (delivery: {
                resourceType: string;
                shareId: string;
                resourceId: string;
                ownerAccountId: string;
                recipientAccountId: string;
                grantedCapabilities: string[];
                expiresAt: string;
            }) => Promise<{ navigationUrl?: string } | null>
        >(`share:deliverUserShare:${record.resourceType}`);
        const delivery =
            !ownerAuthorized && deliverUserShare
                ? await deliverUserShare({
                      resourceType: record.resourceType,
                      shareId: record.id,
                      resourceId: record.resourceId,
                      ownerAccountId: record.ownerAccountId,
                      recipientAccountId: accountId,
                      grantedCapabilities: record.grantedCapabilities,
                      expiresAt: record.expiresAt,
                  })
                : null;
        return {
            resolved: true,
            destinationUrl: this.buildAbsoluteUrl(
                String(
                    delivery?.navigationUrl ??
                        record.metadata?.contentUrl ??
                        "",
                ),
            ),
            passwordProtected: Boolean(record.passwordHash),
        };
    }

    async deleteToken(input: {
        shareId: string;
        ownerAccountId?: string;
        resourceType?: string;
        resourceId?: string;
    }): Promise<boolean> {
        return this.store.deleteById(input);
    }

    async getTokenById(shareId: string): Promise<ShareTokenRecord | null> {
        return this.store.getById(shareId);
    }

    async resolveToken(
        tokenValue: string,
        password?: string | null,
    ): Promise<ShareTokenRecord | null> {
        return this.store.resolve(tokenValue, password);
    }

    async inspectToken(tokenValue: string): Promise<ShareTokenRecord | null> {
        return this.store.inspect(tokenValue);
    }

    async createGuestProfile(input: {
        shareId: string;
        displayName?: string;
        ttlSeconds: number;
    }): Promise<GuestProfileRecord> {
        return this.guestProfileStore.create(input);
    }

    async getGuestProfile(guestId: string): Promise<GuestProfileRecord | null> {
        return this.guestProfileStore.getById(guestId);
    }

    async purgeExpiredShareTokens(): Promise<void> {
        await this.store.purgeExpired();
    }

    async purgeExpiredGuestProfiles(): Promise<void> {
        const expiredProfiles = await this.guestProfileStore.listExpired();
        const deleteKeyringVault = this.resolveCapability<
            (accountId: string) => Promise<void>
        >("auth:deleteKeyringVault");
        for (const profile of expiredProfiles) {
            if (deleteKeyringVault) {
                await deleteKeyringVault(
                    `share:${profile.shareId}:${profile.guestId}`,
                );
            }
            await this.guestProfileStore.deleteById(profile.guestId);
        }
    }

    async createApprovalRequestBatch(input: {
        resourceType: string;
        resourceId: string;
        requesterAccountId: string;
        requesterDisplayName: string;
        targetAccountIds: string[];
        ttlSeconds: number;
    }): Promise<{ mintRequestId: string }> {
        const result = await this.approvalRequestStore.createBatch(input);
        return { mintRequestId: result.mintRequestId };
    }

    async resolveApprovalStatus(mintRequestId: string): Promise<{
        allResponded: boolean;
        anyDeclined: boolean;
    }> {
        return this.approvalRequestStore.resolveExpiredAndSummarize(
            mintRequestId,
        );
    }

    async listPendingApprovalsForAccount(
        accountId: string,
    ): Promise<ShareApprovalRequestRecord[]> {
        return this.approvalRequestStore.listPendingForTarget(accountId);
    }

    async respondToApprovalRequest(input: {
        approvalId: string;
        targetAccountId: string;
        decision: "approved" | "declined";
    }): Promise<boolean> {
        return this.approvalRequestStore.respond(input);
    }

    async purgeExpiredApprovalRequests(): Promise<void> {
        await this.approvalRequestStore.purgeExpired();
    }
}
