import test from 'node:test';
import assert from 'node:assert/strict';
import type { AuthAccountStore } from '@cognis/core';
import { LdapAuthGateway } from '../ldap-auth-gateway.js';

function createStore(): AuthAccountStore {
  const identities = new Map<string, { id: string }>();
  let seq = 0;

  return {
    async findByExternalIdentity(provider, externalUserId) {
      return identities.get(`${provider}:${externalUserId}`) ?? null;
    },
    async createExternalAccount(identity) {
      const id = `acct-${++seq}`;
      identities.set(`${identity.provider}:${identity.externalUserId}`, { id });
      return { id, email: identity.email, isAdmin: identity.isAdmin };
    },
    async updateExternalAccount(accountId, identity) {
      identities.set(`${identity.provider}:${identity.externalUserId}`, { id: accountId });
      return { id: accountId, email: identity.email, isAdmin: identity.isAdmin };
    },
    async createLocalAccount({ email, isAdmin }) {
      return { id: `acct-${++seq}`, email, isAdmin };
    }
  };
}

test('ldap adapter provisions accounts and maps admin groups', async () => {
  const gateway = new LdapAuthGateway({
    accountStore: createStore(),
    client: {
      authenticate: async () => ({
        id: 'uid-1',
        email: 'admin@example.com',
        groups: ['cognis-admins']
      })
    }
  });

  const context = await gateway.authenticate('access-token');

  assert.deepEqual(context, {
    accountId: 'acct-1',
    provider: 'ldap',
    externalUserId: 'uid-1',
    email: 'admin@example.com',
    isAdmin: true
  });
});

test('ldap adapter persists a local admin account', async () => {
  const gateway = new LdapAuthGateway({
    accountStore: createStore(),
    client: { authenticate: async () => null }
  });

  const context = await gateway.createLocalAdmin('root', 'secret');

  assert.equal(context.provider, 'local');
  assert.equal(context.externalUserId, 'root');
  assert.equal(context.isAdmin, true);
  assert.match(context.accountId, /^acct-/);
});
