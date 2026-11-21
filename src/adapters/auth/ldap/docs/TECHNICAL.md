# Technical Reference

The public interfaces and operational rules of LDAP Sign In.

## Interfaces

`LdapClient.authenticate(username, password, options)` returns `LdapIdentity | null`. The adapter reads username/password and optional authSourceId, selects a named server, and returns an AuthContext with provider, externalUserId, email, displayName and role. The default implementation is StandardLdapClient.

## Configuration

Administration stores `unify` and named `servers`. Each ready server needs identifier, serverUrl, baseDn, bindDn, bindPassword, userAttribute and userFilter. Optional userDn/groupDn, groupFilter, memberOf and nestedMemberOf control discovery; roleMappings maps groups to roles. Password writeback requires explicit writebackEnabled and its configured search scope. Unified sources try subsequent servers after a connection failure.

## Behavior

### Connection tests

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

## Security

Directory credentials are validated by the configured LDAP client. Administrator access depends on configured group mappings; protect bind credentials and validate the directory's TLS certificate.

## Reference

- [src/adapters/auth/ldap/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/ldap/manifest.json)
- [src/adapters/auth/ldap/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/ldap/package.json)
- [src/adapters/auth/ldap/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/auth/ldap/index.ts)
