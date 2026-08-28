# Zuverlässiger Meeting-Chat

**Feature Branch:** feature-fix-meeting-chat-generation-issue

## Wiederverwendete Meetings verbinden

Wiederverwendete Meetings speichern nun den neu ermittelten Chatraum, sodass Teilnehmende keinen gelöschten Raum mehr anfordern und keine Nicht-gefunden-Antwort erhalten.

## LDAP-Teilnehmende können beitreten

Die Meeting-Teilnehmersuche behält die Folgeanforderung bei und schließt die aktuelle Person aus. Einladungen werden an das authentifizierte Konto zugestellt, und über LDAP bereitgestellte Teilnehmende bleiben über ihre stabile Kontoidentität berechtigt, wenn sich ihr sichtbarer Benutzername ändert.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/f4538f6775857d81af67d624d800e27ee8b09548
