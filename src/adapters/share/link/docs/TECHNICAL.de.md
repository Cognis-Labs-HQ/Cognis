# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Öffentliche Freigabelinks.

## Schnittstellen

Öffentliche Freigabelinks wird über den zuständigen Funktionsdienst eingebunden; das Manifest nennt die Komponente und ihre Abhängigkeiten.

## Konfiguration

Die Konfiguration erfolgt über den zuständigen Funktionsdienst. Öffentliche Freigabelinks definiert keine zusätzlichen Einstellungen im Manifest.

## Verhalten

### Adapter für Linkfreigaben

Der Adapter deklariert das Link-Popup samt Fähigkeiten über `navbarPlugins`. Das Gateway lädt die deklarierten Beiträge und deaktiviert sie mit ihrem Adapter.

### Verwendungsbeispiele

Erstellt öffentliche, ablaufende Links über das Share-Gateway. Der Adapter verwaltet die linkspezifische Eingabeaufbereitung und die Link-Seite im Gateway-Popup.

## Sicherheit

Der Zugriff auf Öffentliche Freigabelinks unterliegt dem Aufrufer und dem zuständigen Funktionsdienst. Die Aktivierung erweitert keine Kontorechte.

## Referenz

### Technische Spezifikation

Der Adapter validiert methodenspezifische Empfänger- oder Token-Eingaben, übergibt die Orchestrierung freigegebener Ressourcen an das Share-Gateway und bleibt nur aktiv, solange das zuständige Gateway und der Adapterlebenszyklus aktiviert sind.

Aufrufer können im Freigabedialog `allowedPermissions: ["read"]` festlegen, um nur implementierte Berechtigungen anzubieten. Benutzerauswahl und Änderungen berücksichtigen diese Liste. Die Ressource muss dieselben Berechtigungen im Autorisierungsablauf durchsetzen.
