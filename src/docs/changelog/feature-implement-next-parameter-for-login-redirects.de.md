# Rückkehr nach Anmeldung

## Vorherige Seite fortsetzen

Wenn eine Sitzung abläuft, behält Cognis jetzt die aktuelle Seite in der Anmelde-URL bei und führt Benutzer nach erfolgreicher Anmeldung dorthin zurück, anstatt immer das Dashboard zu öffnen.

## Sichere Rückkehrziele

Rückkehrziele nach der Anmeldung sind auf lokale Cognis-Pfade beschränkt, wodurch externe oder rekursive Anmeldeweiterleitungen verhindert werden.

## Nach Verifizierung und Zwei-Faktor-Authentifizierung fortfahren

Die Kontoregistrierung übernimmt das Rückkehrziel in die E-Mail-Verifizierung und die Einrichtung der Zwei-Faktor-Authentifizierung, sodass beide Abläufe anschließend zu der Seite führen, die ursprünglich eine Anmeldung erforderte.

## Dashboard vor der Fortsetzung initialisieren

Nach erfolgreicher Authentifizierung wird jetzt zuerst die Dashboard-Oberfläche geladen, bevor die angeforderte Seite geöffnet wird. Dadurch werden Navigationsbeiträge und die Schlüsselbund-Einrichtung zuverlässig initialisiert.

## Root-relative Rückkehrpfade akzeptieren

Bei Rückkehrzielen der Anmeldung kann der führende Schrägstrich entfallen. Cognis normalisiert sie zu sicheren, root-relativen Pfaden und weist externe Ziele weiterhin ab.
