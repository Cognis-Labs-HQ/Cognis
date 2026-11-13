# Token-Lebenszyklus absichern

**Feature-Zweig:** feature-token-lifecycle-enforcement

## Eingeschränkte Zugangstoken

Das gespeicherte Tokenformat 2 verlangt explizite Sicherheitsfelder und verwirft nicht unterstützte Formate sowie ungültige oder mehrdeutige Datensätze. Abgewiesene Sitzungen erfordern eine erneute Anmeldung; Formate werden nicht automatisch umgewandelt. Gültige normale, eingeschränkte und widerrufene Zugangstoken behalten ihre Berechtigungen nach einem Neustart. Speicherfehler werden gemeldet statt als erfolgreiche Schreibvorgänge bestätigt.

## TFA-Richtlinienänderungen

Alle Zugänge zur TFA-Erzwingung verwenden den zuständigen Richtlinienablauf. Das Abschalten widerruft sämtliche Token mit ausstehender Einrichtung, einschließlich älterer Token des handelnden Administrators; normale Sitzungen bleiben erhalten. Die Bereinigung erfolgt vor dem Schreiben der Richtlinie und kann wiederholt werden. Fehlende Anbieter oder Schreibfehler melden einen Fehler; Tokendatei und Datenbank bilden keine gemeinsame Transaktion. Nach einem Richtlinienfehler können die strengere Richtlinie und bereits widerrufene Token bestehen bleiben. Lokaler atomarer Dateiersatz garantiert weder Schutz vor Hardwareausfällen noch Synchronisierung mehrerer Serverprozesse.

Unabhängige Einstellungsänderungen wenden keine TFA-Richtlinie an. Wenn die TFA-Lesecapability vorhanden ist, verwenden Systemabfragen und Schreibvorgänge ohne TFA-Feld deren aktuelle Richtlinie. Lesefehler werden gemeldet, statt die Erzwingung als deaktiviert anzuzeigen. Ohne diese optionale Capability ist die gespeicherte Einstellung lediglich eine möglicherweise veraltete Kopie. Explizite Richtlinienänderungen erfordern weiterhin die zuständige Capability.

Der Richtlinienablauf verlangt einen einmaligen Vorgang und Ausführungszustand unter Kontrolle seines Eigentümers. Direkte Ablaufaufrufe und die Wiederholung erfasster Vorgänge werden vor Änderungen abgewiesen; Integrationen müssen die Richtliniencapability verwenden.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/61adeda08a08fbf2b6dc7f1cabfb6e1303410f83
- https://github.com/Cognis-Labs-HQ/Cognis/commit/54dbe314805b67619dc9f1b04581520a67005a59
- https://github.com/Cognis-Labs-HQ/Cognis/commit/d207af9658283de310dd1c732754efca7d507c2b
