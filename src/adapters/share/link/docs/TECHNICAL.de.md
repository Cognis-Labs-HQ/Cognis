# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Öffentliche Freigabelinks.

## Schnittstellen

createShareAdapter liefert Methode link, öffentliche Seite und Dialog. prepare leert Empfänger; Token und Rechte gehören Share.

## Konfiguration

Freigaben enthalten accessControls, Ablauf und optionales Passwort. allowedPermissions begrenzt den Dialog; externe Zustellkonten werden nicht eingerichtet.

## Verhalten

### Adapter für Linkfreigaben

Der Adapter deklariert das Link-Popup samt Fähigkeiten über `navbarPlugins`. Das Gateway lädt die deklarierten Beiträge und deaktiviert sie mit ihrem Adapter.

### Verwendungsbeispiele

Erstellt öffentliche, ablaufende Links über das Share-Gateway. Der Adapter verwaltet die linkspezifische Eingabeaufbereitung und die Link-Seite im Gateway-Popup.

## Sicherheit

Linkbesitzer erhalten nur den erlaubten Inhaltsbereich. Ablauf, Passwort und Widerruf werden beim Zugriff geprüft; Aufrufergrenzen beschränken wählbare Rechte.

## Referenz

### Technische Spezifikation

Der Adapter validiert methodenspezifische Empfänger- oder Token-Eingaben, übergibt die Orchestrierung freigegebener Ressourcen an das Share-Gateway und bleibt nur aktiv, solange das zuständige Gateway und der Adapterlebenszyklus aktiviert sind.

Aufrufer können im Freigabedialog `allowedPermissions: ["read"]` festlegen, um nur implementierte Berechtigungen anzubieten. Benutzerauswahl und Änderungen berücksichtigen diese Liste. Die Ressource muss dieselben Berechtigungen im Autorisierungsablauf durchsetzen.
