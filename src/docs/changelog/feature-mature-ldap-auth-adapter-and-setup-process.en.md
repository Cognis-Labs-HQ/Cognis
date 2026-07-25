# Reliable LDAP directory setup

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
