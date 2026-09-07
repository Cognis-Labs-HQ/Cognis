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

A saved LDAP adapter is ready to enable when every named server has a server URL, base DN, bind DN, bind password, username attribute, and user filter. Readiness is evaluated by the adapter so nested multi-server configuration and redacted passwords are handled correctly.

The Administration activation slider remains disabled until at least one LDAP server has been configured.

Completing user verification adds the server to the pending configuration and immediately unlocks activation. Activating at that point saves the pending server list before enabling the adapter. Closing setup after starting an unsaved server requires discard confirmation.

Selecting Save Settings, including by pressing Enter, before manually testing user authentication runs the same authentication test automatically. If authentication fails, setup returns to the connection step so the bind fields can be corrected.

Deleting the final configured server opens a confirmation warning and disables the LDAP adapter when confirmed. Connection tests return field-specific diagnostics for every plausible cause identified from the LDAP response. The setup form highlights all reported fields rather than reducing a multi-field failure, such as rejected bind credentials, to one input.

The setup extension sources its user-facing copy from the adapter language resources. Successful user authentication and server creation or update actions display success toasts.

The adapter declares `/static/adapters/auth/ldap/languages` as its language-resource base. Administration receives that URL in adapter metadata and extends its i18n instance before importing the setup popup.

LDAP connection and credential forms pass adapter localization keys directly to the shared form composer. Attempting user authentication without both required credentials shows a localized error toast and focuses the first invalid field.

Source removal runs the `reconcile-auth-sources` flow. It revokes sessions for every account associated with the removed source. With source unification disabled, the user account is deprovisioned; with unification enabled, only the removed source identity is detached so another configured source can authenticate and refresh the retained account.

Successful Test and Discover requests display a localized success toast before setup advances to filters and role mapping.
