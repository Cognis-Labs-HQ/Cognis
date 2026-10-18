# Rückrufnavigation

**Feature-Zweig:** fix-x-sso-held-login-pr226

## Autorisierung erhalten

`navigateTo` verwendet geschützte Dokumentnavigation innerhalb desselben Ursprungs, wenn das Ziel keine SPA-Route besitzt, entsprechend Hostlinks und Browserverlauf. Ziele anderer Ursprünge werden abgelehnt. `ui:log` liefert einen booleschen Zustellstatus, überspringt anonyme Anfragen und fängt HTTP- oder Netzwerkfehler ab, ohne Zugriffsverweigerungs- oder Verbindungswiederherstellungsereignisse auszulösen. Rückmeldungen an Benutzer bleiben Aufgabe des Aufrufers; der Protokollierungsendpunkt erfordert weiterhin Authentifizierung.

## Commits
