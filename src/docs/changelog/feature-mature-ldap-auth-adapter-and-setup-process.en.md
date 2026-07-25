# Reliable LDAP directory setup

## Live OpenLDAP and FreeIPA discovery

LDAP setup now binds to the configured directory and reads real users and groups before configuration continues. Username attributes, bounded paged searches, nested membership, and safer filters are supported.

## Clear role mapping and writeback controls

Administrators can map a discovered LDAP group to every Cognis role in a table. Password writeback details stay hidden until writeback is enabled.

## Focused directory searches and clearer login choices

Optional user and group DNs can narrow LDAP searches while the base DN remains the fallback. Group choices are alphabetized and show concise names, and login source controls now appear before the credential fields with a clearly visible active selection.
