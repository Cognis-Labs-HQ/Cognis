# Konfigurierbare Protokollausgaben

## Unabhängige Protokollstufen für Konsole und Datei

Administratoren können nun getrennte Schweregradschwellen für die Konsolen- und Dateiprotokollierung aus den vom Logging-Gateway unterstützten Stufen auswählen.

## Laufzeitüberschreibungen mit Zurücksetzen auf Umgebungswerte

Einstellungen der Logging-Adapter können Docker-Umgebungswerte zur Laufzeit überschreiben, einschließlich Konsolenformat, Dateipfad und Rotation, und auf die Umgebungskonfiguration zurückgesetzt werden.

## Einstellungen für dauerhaft aktive Adapter

Die Zeilen „Console Logging“ und „File Logging“ öffnen nun ihr Einstellungsfenster, obwohl diese erforderlichen Adapter nicht deaktiviert werden können.

## Synchronisierte Live-Ausgabe

Die konfigurierte Protokollstufe und das Format ersetzen nun den frühen Bootstrap-Logger für alle danach geladenen Gateways, sodass die Docker-Ausgabe Konsolenänderungen sofort übernimmt. Warnungen zu überschriebenen Umgebungswerten stehen nun orange neben der jeweiligen Feldüberschrift.

## Klarere Konfigurationsbezeichnungen

Warnungen bei Überschreibungen lauten nun „Umgebungsvariable wird überschrieben“, und die Kompressionsoption des Dateiadapters heißt „Log Compression“.
