# SSO-Hostkompatibilität

**Feature-Zweig:** fix-sso-host-compatibility-pr226

## Host-Exporte für Rückrufe prüfen

Externe SSO-Rückrufe benötigen `mountWhenDirect` und `navigateToDocument` aus der Hostdatei `page-entry.js`. `npm run check:ui-host` prüft den Quellstand und `npm run check:ui-build` die gebauten Ressourcen. Nach der Bereitstellung `npm run check:ui-host -- --origin https://your-cognis-host.example` aus einem Netzwerk mit Zugriff auf den Host ausführen. Die Fernprüfung liest nur öffentliches JavaScript, sendet keine Zugangsdaten und analysiert Exporte, ohne heruntergeladenen Code auszuführen. Proxy-Umgebungen können Nodes Unterstützung mit `NODE_USE_ENV_PROXY=1` aktivieren.

Den passenden Core-Host einschließlich UI-Ressourcen und Ressourcenmanifest vor den Rückrufmodulen bereitstellen; einen Prozess, der noch die vorige Veröffentlichung verwendet, neu starten. Die Rückrufseite erst nach erfolgreicher Prüfung der öffentlichen Host-Exporte neu laden. Eine Modulversion belegt nicht den Stand der ausgelieferten Hostressource. Bei deaktivierter öffentlicher Registrierung benötigen unbekannte externe Identitäten weiterhin eine Registrierungsautorisierung; bereits zugeordnete Identitäten durchlaufen sie nicht erneut. HTTP 403 allein erklärt die Ablehnung nicht: Fehlercode und Registrierungsfortsetzungsfelder prüfen, ohne Zugangsdaten oder Cookies weiterzugeben.

## Commits

- [dd1b1fa](https://github.com/Cognis-Labs-HQ/Cognis/commit/dd1b1fac635d28ef8ee9f223e86eb41fd3e08120)
