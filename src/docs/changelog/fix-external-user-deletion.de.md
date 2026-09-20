# Dauerhafte Benutzerlöschung

**Feature-Zweig:** fix-external-user-deletion

## Dauerhafte externe Löschung

Beim Löschen eines extern authentifizierten Benutzers wird nun vor dem Entfernen des Kontos ein nicht umkehrbarer Identitätsfingerabdruck gespeichert. Authentifizierung und Anbieterabgleich weisen diesen Fingerabdruck zurück, sodass eine aktive Anbietersitzung den gelöschten Benutzer nicht unbemerkt neu erstellen kann.

## Commits

- [69ba80376c9eee932299c8ae9f49f86819f77a0d](https://github.com/Cognis-Labs-HQ/Cognis/commit/69ba80376c9eee932299c8ae9f49f86819f77a0d)
- [dac7a3c55115a645ca04a63d7a336e88c69c7673](https://github.com/Cognis-Labs-HQ/Cognis/commit/dac7a3c55115a645ca04a63d7a336e88c69c7673)
