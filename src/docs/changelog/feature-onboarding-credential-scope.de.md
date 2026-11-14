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

- [485d68f4864c40bd172b1745b0ef3ee21956ab7c](https://github.com/Cognis-Labs-HQ/Cognis/commit/485d68f4864c40bd172b1745b0ef3ee21956ab7c)
- [8c1b5561367b4e0377ea58a582deefd01f37d2e5](https://github.com/Cognis-Labs-HQ/Cognis/commit/8c1b5561367b4e0377ea58a582deefd01f37d2e5)
