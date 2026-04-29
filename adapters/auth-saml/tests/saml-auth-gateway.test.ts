import test from 'node:test';
import assert from 'node:assert/strict';
import type { AuthAccountStore } from '@cognis/core';
import { SamlAuthGateway } from '../src/saml-auth-gateway.js';

function createStore(): AuthAccountStore {
  return {
    async findByExternalIdentity() {
      return null;
    },
    async createExternalAccount(identity) {
      return { id: 'acct-saml', email: identity.email, isAdmin: identity.isAdmin };
    },
    async updateExternalAccount(accountId, identity) {
      return { id: accountId, email: identity.email, isAdmin: identity.isAdmin };
    },
    async createLocalAccount() {
      throw new Error('not supported');
    }
  };
}

test('saml adapter authenticates using assertions and provisions accounts', async () => {
  const gateway = new SamlAuthGateway({
    accountStore: createStore(),
    client: {
      consumeAssertion: async () => ({
        nameId: 'sam-user',
        email: 'sam@example.com',
        attributes: {
          groups: ['users', 'cognis-admins']
        }
      })
    }
  });

  const context = await gateway.authenticate('assertion');

  assert.deepEqual(context, {
    accountId: 'acct-saml',
    provider: 'saml',
    externalUserId: 'sam-user',
    email: 'sam@example.com',
    isAdmin: true
  });
});

test('saml adapter does not support local admin creation', async () => {
  const gateway = new SamlAuthGateway({
    accountStore: createStore(),
    client: { consumeAssertion: async () => null }
  });

  await assert.rejects(() => gateway.createLocalAdmin('root', 'secret'));
});
