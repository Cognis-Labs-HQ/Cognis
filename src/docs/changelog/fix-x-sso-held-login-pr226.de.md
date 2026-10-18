# Rückrufnavigation

**Feature-Zweig:** fix-x-sso-held-login-pr226

## Autorisierung erhalten

Dokumentnavigation muss ausdrücklich gewählt werden: Aufrufer mit einem serverseitig gerenderten Ziel übergeben `documentNavigation: true` an `navigateTo`. Unbekannte SPA-Ziele und ungültige URLs liefern false zurück, damit der Aufrufer beispielsweise einen fehlenden Freigabe-Renderer melden kann. Navigationsschutz und HTTP-Prüfungen auf denselben Ursprung gelten weiterhin, auch beim Fortsetzen eines geschützten Übergangs. `ui:log` liefert einen booleschen Zustellstatus, überspringt anonyme Anfragen und fängt HTTP- oder Netzwerkfehler ab, ohne Zugriffsverweigerungs- oder Verbindungswiederherstellungsereignisse auszulösen. Rückmeldungen an Benutzer bleiben Aufgabe des Aufrufers; der Protokollierungsendpunkt erfordert weiterhin Authentifizierung.

## Commits

- [72dfbc8](https://github.com/Cognis-Labs-HQ/Cognis/commit/72dfbc8c8f0b8b456ec5b59e5e2ad5e6652a2cad)
- [9a9387b](https://github.com/Cognis-Labs-HQ/Cognis/commit/9a9387b199dfa3208b83a51aa66d3820a915297a)
