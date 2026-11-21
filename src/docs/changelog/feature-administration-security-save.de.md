# Verwaltung speichern

**Feature-Zweig:** feature-administration-security-save

## Verwaltung speichern

Die Verwaltung speichert nur Bereiche mit ausstehenden Änderungen. Sicherheitsfelder werden erst nach dem erfolgreichen Laden der Sicherheitseinstellungen und der Passwortrichtlinie bearbeitbar. Beim erneuten Darstellen bleiben Änderungen erhalten; beim Verlassen eines geänderten Bereichs ist weiterhin die Bestätigung zum Verwerfen erforderlich. Nach einem teilweise erfolgreichen Speichern bleiben fehlgeschlagene oder neuere Änderungen offen. Ein erneuter Versuch sendet bereits gespeicherte Einstellungen nicht erneut. Die Sicherheitsanleitung erklärt weiterhin Sitzungsrichtlinien und vertrauenswürdige Domains.

## Übersetzungen nach Neustart

Bei der Wiederherstellung der Verbindung werden Übersetzungsspeicher vor dem erneuten Seitenaufbau verworfen. Explizite Aktualisierungen laden aktuelle Serverinhalte und behalten bei Ausfällen vollständige Offlinekopien. Ungültige XML-Antworten werden nicht gespeichert; nachfolgende Ladeversuche können ohne vollständiges Neuladen erfolgreich sein.

## Erste E-Mail-Bestätigung

`tfa:getLoginMethods(accountId)` bereitet eine Challenge nur bei genau einer verfügbaren Methode ohne unbenutzte Wiederherstellungscodes vor. Andernfalls fordert die Login-Oberfläche über `POST /api/v1/tfa/login/resend` eine Challenge für die anfänglich gewählte Methode mit `challengeOnSelect` sowie für spätere Auswahlen ohne bestehende Challenge an. Vorbereitete Challenges werden wiederverwendet. Zustellfehler erscheinen lokalisiert; Protokolle erfassen Methode, Konto, Bereitschaft und Fehlergrund ohne Codes oder E-Mail-Inhalte.

## Commits

- [5670661ce549fca1766d385fdfcb157114365b6d](https://github.com/Cognis-Labs-HQ/Cognis/commit/5670661ce549fca1766d385fdfcb157114365b6d)
- [bce901458c323767adc2321ac3b5d1a1146c95c7](https://github.com/Cognis-Labs-HQ/Cognis/commit/bce901458c323767adc2321ac3b5d1a1146c95c7)
- [947677579880703dff73f7acdfd27c9ee3ef02cb](https://github.com/Cognis-Labs-HQ/Cognis/commit/947677579880703dff73f7acdfd27c9ee3ef02cb)
- [18709e6e484e6c7bf6ddb333d06ffdebdb3b71fa](https://github.com/Cognis-Labs-HQ/Cognis/commit/18709e6e484e6c7bf6ddb333d06ffdebdb3b71fa)
