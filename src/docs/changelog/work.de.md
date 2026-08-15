# Zuverlässige Rückkehr nach der Anmeldung

## Dashboard vor der Fortsetzung initialisieren

Nach erfolgreicher Authentifizierung wird jetzt zuerst die Dashboard-Oberfläche geladen, bevor die angeforderte Seite geöffnet wird. Dadurch werden Navigationsbeiträge und die Schlüsselbund-Einrichtung zuverlässig initialisiert.

## Root-relative Rückkehrpfade akzeptieren

Bei Rückkehrzielen der Anmeldung kann der führende Schrägstrich entfallen. Cognis normalisiert sie zu sicheren, root-relativen Pfaden und weist externe Ziele weiterhin ab.
