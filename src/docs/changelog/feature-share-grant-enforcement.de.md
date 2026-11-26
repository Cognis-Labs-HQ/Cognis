# Freigaben und Übersetzungen

**Feature-Zweig:** feature-share-grant-enforcement

## Ablauf bei Zugriff prüfen

Direkte Benutzerfreigaben gewähren nach Ablauf keinen Zugriff mehr, auch nach Passwortentsperrung und während der Aufbewahrung im Verlauf. Ein leerer Ablaufwert bleibt unbegrenzt; ungültige nichtleere Werte verweigern den Zugriff.

## Ausdrücklichen Rechteentzug beachten

PATCH mit `grantedCapabilities: []` entfernt alle gewährten Fähigkeiten. Ohne dieses Feld bleiben sie erhalten; ein nichtleeres Array ersetzt sie. Empfänger-, Passwort- und Adapterprüfungen bleiben wirksam. Zugestellter Kalenderzugriff wird beim Entfernen des Leserechts gelöscht. Anfragen und Tokenexporte prüfen aktuelle Rechte auch während eines noch ausstehenden Zustellabgleichs.

## Übersetzungskataloge

Schlüsselbundkataloge verwenden das Laufzeit-XML-Wurzelelement, damit Gast-Freigabelinks ihren temporären Schlüsselbund ohne fehlende Übersetzung erstellen können. Fehlende Beschriftungen für Raumschlüssel, Reaktionen, Terminserien, E-Mail-Aktionen, Benachrichtigungen, SSO-Rückmeldungen und den Verwaltungsstatus liegen in allen vier Sprachen vor. Prüfungen der Katalogwurzel und wörtlicher Verweise verhindern entsprechende Lücken in anderen Komponenten.

## Freigabesitzungen und Layout

Geschützte Links verwenden bei wiederholter oder gleichzeitiger Authentifizierung eine Passwortabfrage und einen Gastschlüsselbund. Navigation und Kontowechsel verwerfen ausstehende Auflösungen. Gastseiten überspringen kontobezogene Profilanfragen. Link-Popup-Ressourcen werden innerhalb des Adapterpfads aufgelöst. Kalenderfreigaben warten auf ihre eigenen Stylesheets und halten Titel, Navigation und scrollbar dargestellten Inhalt auf Mobilgeräten, Tablets und Desktops in getrennten Zeilen.

## Dokumentationskonventionen

Kernthemen verwenden großgeschriebene INFO-, USAGE- und TECHNICAL-Dateinamen mit Sprachsuffixen; URLs und versionierte Ansichten bleiben erhalten. Die Prüfung lehnt klein- und gemischtgeschriebene Dateinamen und Manifestpfade ab. Links in Änderungsprotokollen zeigen kurze Commitreferenzen und behalten vollständige unveränderliche SHAs im Ziel; vorhandene lange Linktexte werden in Kern- und Komponentenprotokollen korrigiert.

## Navigation in Kalenderzeiträumen

Kalenderfreigaben unterstützen über dieselbe lebenszyklusgebundene Steuerung wie Kontokalender das Öffnen von Monat, Woche und Tag. Gewähltes Datum und Ansicht ändern sich gemeinsam. Wochennummern bleiben waagerecht, solange ihre eigene Spalte genügend Platz bietet, unabhängig von der Viewportbreite.

Mit Heute, Diese Woche, Dieser Monat oder Dieses Jahr kehrst du zum aktuellen Zeitraum zurück, ohne die Ansicht zu ändern. Die Pfeile wechseln jeweils einen Zeitraum. Diese Steuerung funktioniert auch in Kalenderfreigaben.

Beschriftungen des aktuellen Zeitraums bleiben bei jeder Panelbreite ansichtsspezifisch, auch in Gastkalendern. Browserprüfungen decken frische und zwischengespeicherte Neuladungen unter dem tatsächlichen Service Worker ab.

## Verträge der Dokumentreferenz

Kernhandbücher beschreiben HTTP-Host, Komponenten-/Adapterstart, Sprachanbietererkennung, Browser-/Offline-Grenzen und öffentliche Quelldateien. Technische Referenzen trennen Verträge von Abläufen und Änderungshistorie. Korrigiert sind Einstellungsrouten, README-Sprachauswahl und unveränderliche Modul-ID-Namensräume; wiederholte Passphrasenbeispiele sind zusammengeführt. Prüfungen validieren Dokumentziele und Repository-Links. Die HTML-Linktextprüfung zählt Text direkt, ohne bereinigtes HTML zu erzeugen, auch bei fehlerhaften oder geteilten Tags.

## Strikte Dokumentgliederung

Info, Anwendung und Technik folgen der dokumentierten Abschnittsmatrix in allen vier Sprachen. Die Prüfung lehnt leere sichtbare Abschnitte, versteckte Kommentarinhalte, alternative Überschriften und fehlerhafte Codeblöcke ab. Dateiprüfungen berücksichtigen die Schreibweise von Endung und Sprachsuffix. Tests halten jeden lokalisierten Standard mit dem ausführbaren Schema synchron.

## Commits

- [37279a3](https://github.com/Cognis-Labs-HQ/Cognis/commit/37279a34a3891cca73dbc5cc5c85f3b00b2b2e8a)
- [5244359](https://github.com/Cognis-Labs-HQ/Cognis/commit/5244359630d1cdc12910d11cfb9d20e2c916fbf0)
- [d18f6f0](https://github.com/Cognis-Labs-HQ/Cognis/commit/d18f6f0a62926c095df90a4cd6c15f9484f287b4)
- [1f9c347](https://github.com/Cognis-Labs-HQ/Cognis/commit/1f9c347e1ba3f836f54add76ce83592d85513f3e)
- [ab2b8bb](https://github.com/Cognis-Labs-HQ/Cognis/commit/ab2b8bbb31f93dbc3c816ed2988ff01e4d585c58)
- [a7fe8ac](https://github.com/Cognis-Labs-HQ/Cognis/commit/a7fe8ac3730ec41b4cacc15166715ddbef76eab3)
- [915ed28](https://github.com/Cognis-Labs-HQ/Cognis/commit/915ed288e7efc3c2be5a471126793ab81400d018)
- [67775d4](https://github.com/Cognis-Labs-HQ/Cognis/commit/67775d47445dd7a6cd070645c7c39bd0ee10678a)
- [aace4dd](https://github.com/Cognis-Labs-HQ/Cognis/commit/aace4ddebf574a6bded9c525c017a0d862de855e)
- [f1f86ea](https://github.com/Cognis-Labs-HQ/Cognis/commit/f1f86ea0a157ac3486f0da039230e18bfd276b1e)
- [4df7e6e](https://github.com/Cognis-Labs-HQ/Cognis/commit/4df7e6eb69aa07ab7528c346db81754b4574818b)
- [2cadeac](https://github.com/Cognis-Labs-HQ/Cognis/commit/2cadeac36d4fa009791d3ecfb4f0c021e2a62c47)
