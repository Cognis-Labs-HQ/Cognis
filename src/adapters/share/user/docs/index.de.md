# Adapter für Benutzerfreigaben

## Verwendungsbeispiele

Gibt eine Ressource über das Share-Gateway direkt für Cognis-Benutzer frei. Der Adapter validiert Benutzerempfänger und verwaltet die Benutzer-Seite im Gateway-Popup.

## Technische Spezifikation

Der Adapter validiert methodenspezifische Empfänger- oder Token-Eingaben, übergibt die Orchestrierung freigegebener Ressourcen an das Share-Gateway und bleibt nur aktiv, solange das zuständige Gateway und der Adapterlebenszyklus aktiviert sind.

Aufrufer können im Freigabedialog `allowedPermissions: ["read"]` festlegen, um nur implementierte Berechtigungen anzubieten. Benutzerauswahl und Änderungen berücksichtigen diese Liste. Die Ressource muss dieselben Berechtigungen im Autorisierungsablauf durchsetzen.
