# Optionale E-Mail Registrierung

**Feature Branch:** copilot/update-registration-email-requirement

## E-Mail ist nicht mehr erforderlich, wenn die Benutzervalidierungsmethode auf „Keine" gesetzt ist

Wenn die Benutzervalidierungsmethode unter Administration > Sicherheit auf „Keine" gesetzt ist, ist das E-Mail-Feld auf der Registrierungsseite jetzt optional. Der Hinweis zur E-Mail-Verifizierung wird in diesem Modus ebenfalls ausgeblendet. Der Server erzwingt keine E-Mail-Verifizierung mehr und löscht keine neu registrierten Konten ohne E-Mail-Adresse, wenn der Validierungsmodus auf „Keine" gesetzt ist.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/92f2856698dacd9bf208f2ffa3d0b5e77c4971fa
