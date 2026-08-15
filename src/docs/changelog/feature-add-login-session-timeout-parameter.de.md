# Konfigurierbare Laufzeiten für Anmeldesitzungen

## Administratoren steuern die maximale Sitzungsdauer

Unter Administration → Sicherheit kann jetzt das standardmäßige und maximale Zeitlimit für Anmeldesitzungen festgelegt werden.

## Benutzer können eine kürzere Sitzung wählen

Jeder Benutzer kann unter Einstellungen → Sicherheit ein kürzeres Zeitlimit auswählen. Neu ausgestellte Anmeldetoken verwenden diese gespeicherte Einstellung und bleiben über Anwendungs- und Datenbankneustarts hinweg gültig.

## Zeiteinheit auswählen

Zeitlimits für Anmeldesitzungen können jetzt in Minuten, Stunden, Tagen oder Wochen angegeben werden, ohne Werte in Minuten umzurechnen.

## Sitzungen ohne Zeitlimit zulassen

Administrationen können „Nie“ auswählen, um den Ablauf von Sitzungen zu deaktivieren. Ein deutlicher Hinweis warnt davor, diese Einstellung in Produktionsumgebungen zu verwenden.

## Sicherheitseinstellungen übersichtlich gliedern

Die Sicherheitseinstellungen für Benutzer zeigen das Zeitlimit der Anmeldesitzung jetzt als eigenen Unterabschnitt, entsprechend der Gliederung in der Administration.

## Änderungen am Zeitlimit zuverlässig verfolgen

Die Felder für das Sitzungszeitlimit werden jetzt sowohl in der Administration als auch in den Benutzereinstellungen als ungespeicherte Änderungen erfasst. In den Benutzereinstellungen trennt ein einheitlicher Abschnittsabstand außerdem die Passwortaktion von der Überschrift des Zeitlimits.
