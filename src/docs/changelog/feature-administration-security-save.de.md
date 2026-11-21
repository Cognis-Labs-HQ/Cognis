# Verwaltung speichern

**Feature-Zweig:** feature-administration-security-save

## Verwaltung speichern

Die Verwaltung speichert nur Bereiche mit ausstehenden Änderungen. Sicherheitsfelder werden erst nach dem erfolgreichen Laden der Sicherheitseinstellungen und der Passwortrichtlinie bearbeitbar. Beim erneuten Darstellen bleiben Änderungen erhalten; beim Verlassen eines geänderten Bereichs ist weiterhin die Bestätigung zum Verwerfen erforderlich. Nach einem teilweise erfolgreichen Speichern bleiben fehlgeschlagene oder neuere Änderungen offen. Ein erneuter Versuch sendet bereits gespeicherte Einstellungen nicht erneut. Die Sicherheitsanleitung erklärt weiterhin Sitzungsrichtlinien und vertrauenswürdige Domains.

## Übersetzungen nach Neustart

Bei der Wiederherstellung der Verbindung werden Übersetzungsspeicher vor dem erneuten Seitenaufbau verworfen. Explizite Aktualisierungen laden aktuelle Serverinhalte und behalten bei Ausfällen vollständige Offlinekopien. Ungültige XML-Antworten werden nicht gespeichert; nachfolgende Ladeversuche können ohne vollständiges Neuladen erfolgreich sein.

## Commits

- [5670661ce549fca1766d385fdfcb157114365b6d](https://github.com/Cognis-Labs-HQ/Cognis/commit/5670661ce549fca1766d385fdfcb157114365b6d)
