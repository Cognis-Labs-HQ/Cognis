# Gelöschte externe Konten neu erstellen

**Feature-Zweig:** recreate-deleted-external-identities

## Wiederherstellung nach erfolgreicher Authentifizierung

Eine erfolgreich authentifizierte externe Identität kann nun ihr gelöschtes anbieterbezogenes Konto neu erstellen. Cognis entfernt den Löschvermerk in derselben Transaktion, in der das Konto wiederhergestellt wird; eine fehlgeschlagene Authentifizierung kann ihn nicht entfernen.

## Commits

- [5282575c57d00af6665f5c2d4ae3a9e265b870da](https://github.com/Cognis-Labs-HQ/Cognis/commit/5282575c57d00af6665f5c2d4ae3a9e265b870da)
