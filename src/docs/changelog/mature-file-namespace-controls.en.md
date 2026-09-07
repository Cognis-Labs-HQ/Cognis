# Mature File Namespace Controls

**Feature Branch:** N/A

## Hardened namespace contracts

The files gateway now validates namespace and component identifiers at registration time, normalizes allow-lists, and stores immutable namespace definitions so future components consume a predictable namespace contract.

## Safer ACL and quota behavior

Namespaced file reads remain shareable according to each namespace ceiling, but overwrites and deletes are restricted to owners or privileged actors. Quota checks now account for same-owner overwrites by charging only the resulting size delta.

## Commits
