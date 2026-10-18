# Rückrufnavigation

**Feature-Zweig:** fix-x-sso-held-login-pr226

## Autorisierung erhalten

`navigateTo` verwendet geschützte Dokumentnavigation innerhalb desselben Ursprungs, wenn das Ziel keine SPA-Route besitzt, entsprechend Hostlinks und Browserverlauf. Ziele anderer Ursprünge werden abgelehnt. `ui:log` liefert einen booleschen Zustellstatus, überspringt anonyme Anfragen und fängt HTTP- oder Netzwerkfehler ab, ohne Zugriffsverweigerungs- oder Verbindungswiederherstellungsereignisse auszulösen. Rückmeldungen an Benutzer bleiben Aufgabe des Aufrufers; der Protokollierungsendpunkt erfordert weiterhin Authentifizierung.

## Commits

- [72dfbc8](https://github.com/Cognis-Labs-HQ/Cognis/commit/72dfbc8c8f0b8b456ec5b59e5e2ad5e6652a2cad)
