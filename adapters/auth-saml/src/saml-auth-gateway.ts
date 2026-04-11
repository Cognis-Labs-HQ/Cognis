import type { AuthContext, AuthGateway, AuthAccountStore } from '@cognis/core';

export interface SamlAssertion {
  nameId: string;
  email?: string;
  attributes?: Record<string, string | string[]>;
}

export interface SamlClient {
  consumeAssertion(encodedAssertion: string): Promise<SamlAssertion | null>;
}

export interface SamlAuthGatewayOptions {
  client: SamlClient;
  accountStore: AuthAccountStore;
  adminAttribute?: string;
  adminValue?: string;
}

export class SamlAuthGateway implements AuthGateway {
  constructor(private readonly options: SamlAuthGatewayOptions) {}

  async authenticate(token: string): Promise<AuthContext | null> {
    const assertion = await this.options.client.consumeAssertion(token);
    if (!assertion) {
      return null;
    }

    const adminAttribute = this.options.adminAttribute ?? 'groups';
    const adminValue = this.options.adminValue ?? 'cognis-admins';
    const rawAttribute = assertion.attributes?.[adminAttribute];
    const values = Array.isArray(rawAttribute) ? rawAttribute : rawAttribute ? [rawAttribute] : [];
    const isAdmin = values.includes(adminValue);

    const existing = await this.options.accountStore.findByExternalIdentity('saml', assertion.nameId);
    const account = existing
      ? await this.options.accountStore.updateExternalAccount(existing.id, {
          provider: 'saml',
          externalUserId: assertion.nameId,
          email: assertion.email,
          isAdmin
        })
      : await this.options.accountStore.createExternalAccount({
          provider: 'saml',
          externalUserId: assertion.nameId,
          email: assertion.email,
          isAdmin
        });

    return {
      accountId: account.id,
      provider: 'saml',
      externalUserId: assertion.nameId,
      email: assertion.email,
      isAdmin
    };
  }

  async createLocalAdmin(): Promise<AuthContext> {
    throw new Error('SAML adapter cannot create local admins directly.');
  }
}
