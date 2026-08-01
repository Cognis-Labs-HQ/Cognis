# Profile bewahren und verschlüsselte Unterhaltungen stabilisieren

## Das Zurücksetzen des Schlüsselbunds bewahrt die soziale Identität

Beim Löschen eines Schlüsselbunds werden Mitgliedschaften in Nachrichtenräumen nicht mehr entfernt. Profilbasierte soziale Aktionen erstellen außerdem ein fehlendes Profil des angemeldeten Kontos vor der Verwendung neu, sodass bei Konten, die von einer früheren destruktiven Zurücksetzung betroffen sind, keine leeren Akteursnamen erscheinen.

## Direktunterhaltungen sind idempotent

Gleichzeitige Anfragen zum Starten derselben Direktunterhaltung werden serialisiert und prüfen erneut auf einen vorhandenen Raum. Dadurch entstehen bei schnellen oder überlappenden Anfragen keine doppelten Räume.

## Nachrichten warten auf die aktive Schlüsselauflösung

Gleichzeitige Auflösungen von Raumschlüsseln werden pro Raum koordiniert, sodass der SPA-Einstieg keinen veralteten Hinweis zum Entsperren anzeigt, während der bereits entsperrte Schlüsselbund denselben Raumschlüssel auflöst.
