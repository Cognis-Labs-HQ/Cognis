# LDAP Authentication Adapter

## Overview

The LDAP adapter authenticates users against an LDAP directory server, making it the right choice for organisations that already manage identities in Active Directory, OpenLDAP, or a similar directory service. Users log in with an LDAP access token; the adapter binds to the directory with a service account, searches for the user, and maps group membership to the Cognis admin role.

Because LDAP manages identities externally, there are no passwords to manage inside Cognis for LDAP users. The local auth adapter remains active alongside LDAP so that a break-glass admin account is always available even if the directory server is unreachable.

## Responsibilities

- Accept an `accessToken` credential, authenticate it against the LDAP server via the configured `LdapClient`.
- Map the authenticated user's LDAP groups to the Cognis `isAdmin` flag using the `adminGroups` configuration.
- Expose the `AuthProviderAdapter` interface to the auth gateway.
- Provide a `getConfigSchema()` describing all configurable fields.

Not responsible for: binding or searching LDAP directly (that is the injected `LdapClient`'s concern), storing user accounts locally, or handling session state.

## Architecture

`LdapAuthAdapter` in `src/adapters/auth/ldap/index.ts` implements `AuthProviderAdapter`. It holds a reference to an `LdapClient` instance that performs the actual directory operations, and a `Set<string>` of admin groups parsed from the `adminGroups` configuration field.

```ts
export interface LdapClient {
    authenticate(accessToken: string): Promise<LdapIdentity | null>;
}

export interface LdapIdentity {
    id: string;
    email?: string;
    groups?: string[];
}
```

On `authenticate(credentials)`, the adapter:

1. Extracts `credentials.accessToken`.
2. Calls `this.client.authenticate(accessToken)`.
3. Checks whether any of the identity's `groups` intersect `adminGroups`.
4. Returns an `AuthContext` with `provider: 'ldap'`, `externalUserId`, `email`, and `isAdmin`.

The adapter is enabled and configured through the auth gateway admin API, not through environment variables.

## Configuration

Configure via `PUT /api/v1/gateways/auth/adapters/ldap/config` (admin only).

| Key            | Description                                                  | Required |
| -------------- | ------------------------------------------------------------ | -------- |
| `host`         | LDAP server hostname                                         | Yes      |
| `port`         | LDAP server port                                             | Yes      |
| `bindDn`       | Bind DN for the service account                              | Yes      |
| `bindPassword` | Password for the bind DN                                     | Yes      |
| `baseDn`       | Base DN for user searches                                    | Yes      |
| `adminGroups`  | Comma-separated LDAP groups whose members receive admin role | No       |

## Connection tests

The adapter test endpoint validates the configured service-account bind before directory discovery. Invalid LDAP credentials are reported as a bind DN or password rejection; transport and certificate failures use separate safe diagnostics. Detailed provider errors are recorded only in server logs.
