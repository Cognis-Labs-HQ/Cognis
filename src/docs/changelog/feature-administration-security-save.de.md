# Verwaltung speichern

**Feature-Zweig:** feature-administration-security-save

## Verwaltung speichern

Die Verwaltung speichert nur Bereiche mit ausstehenden Änderungen. Sicherheitsfelder werden erst nach dem erfolgreichen Laden der Sicherheitseinstellungen und der Passwortrichtlinie bearbeitbar. Beim erneuten Darstellen bleiben Änderungen erhalten; beim Verlassen eines geänderten Bereichs ist weiterhin die Bestätigung zum Verwerfen erforderlich. Nach einem teilweise erfolgreichen Speichern bleiben fehlgeschlagene oder neuere Änderungen offen. Ein erneuter Versuch sendet bereits gespeicherte Einstellungen nicht erneut. Die Sicherheitsanleitung erklärt weiterhin Sitzungsrichtlinien und vertrauenswürdige Domains.

## Übersetzungen nach Neustart

Nach der Verbindungswiederherstellung werden bereits geladene Übersetzungspakete vor dem Seitenaufbau aktualisiert. Normale Abfragen nutzen den Offlinecache sofort; ungültiges XML wird abgelehnt und mit einer Aktualisierung erneut geladen.

## Erste E-Mail-Bestätigung

Die anfangs ausgewählte Methode fordert bei Bedarf eine E-Mail-Challenge an. Zustellung und erneute Anfragen haben eine Frist von 15 Sekunden und blockieren weder Authenticator noch Wiederherstellungscodes. Laufende Anfragen werden nicht dupliziert und beim Öffnen einer neuen Anmeldeeingabe abgebrochen.

## Zentrale Browserdiagnose

Die Protokollierung steuert Serverübertragung und Browserausgabe nach Gateway-Berechtigung und Schweregrad. Server und Browser verwenden einen gemeinsamen Katalog für Stufen, Prioritäten und Konsolen-Aliasse. Metadaten enthalten weder Zugangsdaten noch rohe Fehlermeldungen. Das Gateway stellt Logging über ctx bereit; Core liefert nur allgemeine Fähigkeitsbereitschaft und begrenzte aufgeschobene Aufrufe.

## Grenze der Protokollierung

Quelltextprüfungen erzwingen Gateway-Protokollierung in Anwendung und externen Modulen, auch in Browserskripten und Ereignisbehandlungen. Die Skripterkennung berücksichtigt vom Browser akzeptierte Leerzeichen und Attribute in End-Tags, zitierte Trennzeichen und nicht geschlossene Skripte. Befehls- und Buildberichte bleiben Terminalausgaben.

## Commits

- [996af37783915d3246df5c1fc1044b01c4f46fa1](https://github.com/Cognis-Labs-HQ/Cognis/commit/996af37783915d3246df5c1fc1044b01c4f46fa1)
- [bce901458c323767adc2321ac3b5d1a1146c95c7](https://github.com/Cognis-Labs-HQ/Cognis/commit/bce901458c323767adc2321ac3b5d1a1146c95c7)
- [947677579880703dff73f7acdfd27c9ee3ef02cb](https://github.com/Cognis-Labs-HQ/Cognis/commit/947677579880703dff73f7acdfd27c9ee3ef02cb)
- [18709e6e484e6c7bf6ddb333d06ffdebdb3b71fa](https://github.com/Cognis-Labs-HQ/Cognis/commit/18709e6e484e6c7bf6ddb333d06ffdebdb3b71fa)
- [fa239f1b4e9dc5f0ca34c10e6ada95b95014a227](https://github.com/Cognis-Labs-HQ/Cognis/commit/fa239f1b4e9dc5f0ca34c10e6ada95b95014a227)
- [57fe89b2259021a0e015d76a950bd35f64376184](https://github.com/Cognis-Labs-HQ/Cognis/commit/57fe89b2259021a0e015d76a950bd35f64376184)
- [3167a5a53da2ed87485b7b9df244b7edc9bf5089](https://github.com/Cognis-Labs-HQ/Cognis/commit/3167a5a53da2ed87485b7b9df244b7edc9bf5089)
- [753f9e4893d00853626fd21392e7ce21f560353e](https://github.com/Cognis-Labs-HQ/Cognis/commit/753f9e4893d00853626fd21392e7ce21f560353e)
