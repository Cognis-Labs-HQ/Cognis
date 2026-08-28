# Ladeanimation behoben

**Feature-Zweig:** copilot/fix-loading-wheel-issue

## Ladeanimation erscheint nicht mehr über Passwort-Bestätigungs-Popups

Das Seitenladeoverlay wird jetzt unterdrückt, wenn ein Popup geöffnet ist. Dadurch wird verhindert, dass es Passwortbestätigungen und andere interaktive Eingabeaufforderungen verdeckt, die während des Seitenladens erscheinen.

## Passwort-Eingabefeld ist jetzt korrekt in ein Formular eingebettet

Das Passwortfeld im Neu-Bestätigungs-Popup ist jetzt in ein `<form>`-Element eingebettet und behebt die Browserwarnung über Passwortfelder, die nicht in einem Formular enthalten sind.

## Änderungen

- [8058581](https://github.com/Cognis-Labs-HQ/Cognis/commit/805858123bc36713ef78b0f6ee038fdf3613782a)
