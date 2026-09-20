export type SharePermission = "read" | "write";
export type ShareRecipientType = "user" | "group" | "email";

export interface ShareRecipient {
    type: ShareRecipientType;
    id: string;
    label?: string | null;
    handle?: string | null;
    avatarKey?: string | null;
    permissions: SharePermission[];
}

export interface ShareAccessControls {
    permissions: SharePermission[];
    recipients: ShareRecipient[];
    passwordProtected: boolean;
    watermarkReadonly: boolean;
}

export interface ShareTokenRecord {
    id: string;
    resourceKey: string;
    ownerAccountId: string;
    resourceType: string;
    resourceId: string;
    metadata: Record<string, string> | null;
    tokenValue: string;
    tokenHash: string;
    passwordHash: string | null;
    label: string | null;
    grantedCapabilities: string[];
    accessControls: ShareAccessControls;
    expiresAt: string;
    expirationNotifiedAt: string;
    lastAccessedAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface ShareActivityEvent {
    id: string;
    shareId: string;
    type: "created" | "updated" | "accessed";
    occurredAt: string;
}
