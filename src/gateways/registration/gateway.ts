import type { RegistrationTokenAdapter } from "../../adapters/registration/token/index.js";

export class CoreRegistrationGateway {
    constructor(private readonly adapter: RegistrationTokenAdapter) {}

    async issueInvite(input: {
        inviterAccountId: string;
        inviterDisplayName: string;
        inviteeEmail: string;
        inviterIsFounder: boolean;
        inviteBaseUrl: string;
    }) {
        return this.adapter.issueInvite(input);
    }

    async listInvites(filter?: {
        inviterAccountId?: string;
        includeClosed?: boolean;
    }) {
        return this.adapter.listInvites(filter);
    }

    async revokeInvite(input: { tokenId: string; revokedByAccountId: string }) {
        return this.adapter.revokeInvite(input);
    }

    async resolveInvite(token: string) {
        return this.adapter.resolveInvite(token);
    }

    async redeemInvite(input: {
        token: string;
        username: string;
        password: string;
        displayName?: string;
    }) {
        return this.adapter.redeemInvite(input);
    }
}
