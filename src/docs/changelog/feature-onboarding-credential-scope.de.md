# Begrenzte Registrierung

**Feature-Zweig:** feature-onboarding-credential-scope

## Begrenztes Onboarding

Registrierung verwendet zeitlich begrenzte Auth-Berechtigungen für deklarierte eigene Operationen, keine gewöhnlichen Sitzungen. Notify bleibt auf das neue Konto begrenzt; normale Anmeldung erzwingt weiterhin TFA.

## Ausdrücklicher Abschluss

Abschluss, Abbruch und normale Anmeldung widerrufen Onboarding-Berechtigungen. Lebensdauer- und Speicherfehler verweigern weiteren Zugriff; bereits ausgeführte externe Wirkungen sind nicht atomar rückgängig zu machen.

## Erweiterungen umstellen

Abschlusserweiterungen verwenden deklarierte Operationen. Diese Veröffentlichung mit Terms of Service 1.6.13 koordinieren und tatsächliche Zustimmung sowie Dokumentversionen prüfen.

Die Registrierung verhindert das Absenden, wenn erforderliche Abschlusshandler, Deklarationen oder Formularfelder fehlen. Operationsdeklarationen werden vor Erweiterungsaufrufen festgehalten. Beim Verlassen der Verifizierung schließt sich das Popup und der Nachweis wird widerrufen.

## Commits

- [2ca3f67183c56d0f93b9352c81e1ed9c4778b87b](https://github.com/Cognis-Labs-HQ/Cognis/commit/2ca3f67183c56d0f93b9352c81e1ed9c4778b87b)
