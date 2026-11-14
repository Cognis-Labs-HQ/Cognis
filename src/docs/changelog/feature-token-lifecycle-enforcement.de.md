# Token-Lebenszyklus absichern

**Feature-Zweig:** feature-token-lifecycle-enforcement

## Eingeschränkte Zugangstoken

Das gespeicherte Tokenformat 2 verlangt explizite Sicherheitsfelder und verwirft nicht unterstützte Formate sowie ungültige oder mehrdeutige Datensätze. Abgewiesene Sitzungen erfordern eine erneute Anmeldung; Formate werden nicht automatisch umgewandelt. Gültige normale, eingeschränkte und widerrufene Zugangstoken behalten ihre Berechtigungen nach einem Neustart. Speicherfehler werden gemeldet statt als erfolgreiche Schreibvorgänge bestätigt.

## TFA-Richtlinienänderungen

Alle Zugänge zur TFA-Erzwingung verwenden den zuständigen Richtlinienablauf. Das Abschalten widerruft sämtliche Token mit ausstehender Einrichtung, einschließlich älterer Token des handelnden Administrators; normale Sitzungen bleiben erhalten. Die Bereinigung erfolgt vor dem Schreiben der Richtlinie und kann wiederholt werden. Fehlende Anbieter oder Schreibfehler melden einen Fehler; Tokendatei und Datenbank bilden keine gemeinsame Transaktion. Nach einem Richtlinienfehler können die strengere Richtlinie und bereits widerrufene Token bestehen bleiben. Lokaler atomarer Dateiersatz garantiert weder Schutz vor Hardwareausfällen noch Synchronisierung mehrerer Serverprozesse.

Unabhängige Einstellungsänderungen wenden keine TFA-Richtlinie an. Wenn die TFA-Lesecapability vorhanden ist, verwenden Systemabfragen und Schreibvorgänge ohne TFA-Feld deren aktuelle Richtlinie. Lesefehler werden gemeldet, statt die Erzwingung als deaktiviert anzuzeigen. Ohne diese optionale Capability ist die gespeicherte Einstellung lediglich eine möglicherweise veraltete Kopie. Explizite Richtlinienänderungen erfordern weiterhin die zuständige Capability.

Der Richtlinienablauf verlangt einen einmaligen Vorgang und Ausführungszustand unter Kontrolle seines Eigentümers. Direkte Ablaufaufrufe und die Wiederholung erfasster Vorgänge werden vor Änderungen abgewiesen; Integrationen müssen die Richtliniencapability verwenden.

## Isolierte Testzugangsdaten

`npm test` und `npm run ci:test` erstellen für jeden Lauf ein temporäres Tokenverzeichnis und für jeden Testprozess eine eigene beschreibbare Datei. Eine statische Vorabinitialisierung setzt den Pfad vor dem Laden der Testmodule und ignoriert geerbte produktive Tokenspeicherpfade. Tests dürfen anschließend ihren eigenen Pfad für Neustart- oder Fehlerfälle überschreiben. Nach erfolgreicher oder fehlgeschlagener Ausführung des Kindprozesses entfernt der Teststarter sein temporäres Verzeichnis und leitet reguläre Beendigungssignale weiter. Erzwungener Prozessabbruch oder Hostausfall kann temporäre Dateien hinterlassen, die das Betriebssystem bereinigen muss. Die produktive Tokenpersistenz bleibt unverändert und verweigert bei Fehlern den Erfolg.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/3a2f90aa804ed98e3ba72cc10724913cf14bbf84
- https://github.com/Cognis-Labs-HQ/Cognis/commit/b44cbd57317dfaaef823ea3ee8c6589eacde1dae
