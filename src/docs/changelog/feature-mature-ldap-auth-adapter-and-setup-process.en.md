# Reliable LDAP directory setup

**Feature Branch:** feature-mature-ldap-auth-adapter-and-setup-process

## Live OpenLDAP and FreeIPA discovery

LDAP setup now binds to the configured directory and reads real users and groups before configuration continues. Username attributes, bounded paged searches, nested membership, and safer filters are supported.

## Clear role mapping and writeback controls

Administrators can map a discovered LDAP group to every Cognis role in a table. Password writeback details stay hidden until writeback is enabled.

## Focused directory searches and clearer login choices

Optional user and group DNs can narrow LDAP searches while the base DN remains the fallback. Group choices are alphabetized and show concise names, and login source controls now appear before the credential fields with a clearly visible active selection.

## Provider-owned account actions and stable LDAP sessions

Each login source now controls its own recovery actions, so the local forgot-password link disappears when LDAP is selected. Password changes are only offered when the signed-in provider supports them, including LDAP when writeback is enabled, and LDAP sessions no longer depend on a matching local account record.

## Persistent external account identities

Successful LDAP sign-ins now create the shared account record and LDAP identity before profile provisioning. This preserves database foreign-key integrity and gives LDAP accounts the same profile and session foundation as local accounts without creating local password credentials.

## Reliable login mode transitions

Returning from password recovery now restores the credential form in place instead of refreshing parked page content, preventing duplicate auth-source selectors. The credential source selector is also hidden while a two-factor challenge is active.

## Accurate repeatable directory discovery

Every Test and Discover run now replaces the prior sample before rebuilding role mappings. User and group searches consistently use their dedicated DNs, falling back independently to the base DN, and non-group LDAP objects are excluded from group choices.

## Enforced discovery boundaries and identity schema

Discovery now rejects any directory entry whose DN falls outside the configured user or group search base, preventing user-container records from reaching group mappings even when a server returns unexpected results. Auth bootstrap also creates the external identity table before LDAP logins persist identities.

## LDAP email provisioning and immediate validation

LDAP login now reads every listed mail address while bound as the authenticating user and provisions them into Cognis without creating local credentials. The first address becomes primary; when email validation is required, its verification message is sent immediately and the login flow proceeds directly to code verification.

## Reliable adapter-owned setup loading

The authentication gateway now publishes LDAP's setup interface through the adapter asset registry, so opening LDAP configuration no longer fails with a missing script.

## Explicit setup extension discovery

Administration now loads a custom setup interface only when an adapter announces one. Standard adapters such as SMTP use the generic form without generating failed script requests.

## Multiple named LDAP sources

Administrators can manage and reorder multiple named LDAP servers. Sources can appear separately on the Login page or as one unified LDAP option that tries servers in the configured order.

## Required user credential verification

LDAP setup now ends with a required bind using a real directory user's credentials. The resulting identity, groups, and Cognis role are shown before the server can be saved, and mapped user-group restrictions are enforced.

## Responsive login source placement

The Local and LDAP source selector sits directly between the Login title and Username field. Source buttons adapt to the available width, with additional sources available from a scrollable overflow selector.

## Login source metadata preserved

The public login configuration now preserves credential-source metadata for every named LDAP server, ensuring Local and all configured LDAP sources actually render together in the selector row. Named, non-unified LDAP sources use their administrator-defined identifiers as their button labels.

## Protected LDAP bind secrets

Saved LDAP bind passwords are removed from administration API responses. Leaving the password field blank keeps the existing secret, while entering a new value securely replaces it.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/88fe3b0bec731d1c090768792cd73cea7264106e
