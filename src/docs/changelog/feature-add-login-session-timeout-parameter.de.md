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

## Benutzerauswahl bewahren und Ablauf melden

Kompatible Änderungen des Zeitlimits in der Administration lassen die gespeicherte Dauer jedes Benutzers unverändert; vorübergehend niedrigere Grenzen beschränken sie, ohne sie zu überschreiben. Abgelaufene API-Sitzungen führen Benutzer sofort zur Anmeldung zurück und zeigen den bestehenden Hinweis zum Sitzungsablauf.

## Auf das globale Zeitlimit zurücksetzen

Die Benutzereinstellungen bieten jetzt neben der Zeiteinheit eine Schaltfläche mit Rückgängig-Symbol. Nach dem Zurücksetzen folgt das Sitzungszeitlimit den aktuellen und zukünftigen Standardwerten der Administration statt einer benutzerdefinierten Dauer.

## Änderungen am Zeitlimit sicher anwenden

„Nie“ blendet jetzt das Zahlenfeld aus und lässt sich ohne Validierungsfehler speichern. Die Benutzereinstellungen zeigen eine deaktivierte Auswahl „Nie“, wenn der Ablauf global deaktiviert ist. Das Speichern oder Zurücksetzen eines persönlichen Zeitlimits widerruft alle bestehenden Sitzungen dieses Benutzers.

## Globales Zeitlimit beim Zurücksetzen aktualisieren

Die Schaltfläche zum Zurücksetzen ist jetzt immer verfügbar. Bei jedem Klick wird das aktuelle Zeitlimit der Administration neu geladen und nur dann eine Änderung vorgemerkt, wenn sich der wirksame Wert oder die Bindung an den Standardwert unterscheidet.

## „Nie“ bei der Anmeldung bewahren

Der Authentifizierungsstart bewahrt jetzt das gespeicherte globale Zeitlimit von null Minuten, statt es durch den 12-Stunden-Rückfallwert zu ersetzen. Synchronisierte Benutzer erhalten dadurch Sitzungen ohne Ablauf.

## Countdown der aktuellen Sitzung anzeigen

Die Benutzersicherheitseinstellungen zeigen jetzt neben den Zeitlimit-Steuerelementen die verbleibende Zeit der aktuellen Sitzung. Der Countdown verwendet den bei der Sitzungsausgabe gespeicherten Ablaufzeitpunkt und entfällt bei Sitzungen ohne Ablauf.

## Countdown-Logik in der Authentifizierung halten

Die Countdown-Formatierung liegt jetzt im Authentifizierungs-Gateway statt in der allgemeinen UI-Wiederverwendung. Die aktuelle Sitzung wird verständlich in Wochen, Tagen, Stunden, Minuten und Sekunden angezeigt.

## Ausgewähltes Zeitlimit während der Verifizierung beibehalten

Anmeldesitzungen behalten nun die von der Administration oder vom Benutzer gewählte Dauer bei, während die Zwei-Faktor-Verifizierung oder die erforderliche Einrichtung abgeschlossen wird. Dies gilt auch für Sitzungen ohne Ablaufdatum.

## Nicht speicherbare Einstellungen ablehnen

Änderungen am Sitzungszeitlimit geben nun einen Verfügbarkeitsfehler zurück, ohne aktive Sitzungen zu widerrufen, wenn der Einstellungsspeicher deaktiviert ist.
