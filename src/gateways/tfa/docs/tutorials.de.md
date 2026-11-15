# Geführte Anleitungen

Diese Anleitungen erklären die verfügbaren Aktionen dieser Komponente.

## Anleitung verwenden

Öffnen Sie eine der folgenden Seiten für eine noch nicht abgeschlossene Anleitung. Über das ? neben dem Seitentitel wiederholen Sie eine abgeschlossene Anleitung; Überspringen beendet die Wiederholung.

## Technische Spezifikation

| Seite / Bereich                        | Anleitung              | Zugriff             |
| -------------------------------------- | ---------------------- | ------------------- |
| `/settings` · `#tfa-settings-panel`    | Zwei-Faktor-Sicherheit | Angemeldeter Nutzer |
| `/administration` · `#tfa-enforcement` | Zwei-Faktor-Pflicht    | Administrator       |

Anleitungen registrieren sich über die öffentliche Capability `ui:tutorials` mit komponenteneigenen Definitionen, Katalogen, Zielen und Lebenszyklus-Signalen. Seiten, sichtbare Bereiche und Zugriffsrechte bestimmen die Verfügbarkeit. Das Entfernen der Komponente gibt ihre Anleitungen frei. Darstellung und Abschluss beschreibt der [Tutorial-Vertrag des Hosts](/docs/tutorials).

Wiederherstellungscodes helfen bei nicht verfügbarem zweitem Faktor. Die Durchsetzungsanleitung hebt den Schalter statt des gesamten Bereichs hervor.

## Zeitlich begrenzte Challenge-Zustellung

Bei Email Code bedeutet „wartend“, dass die Zustellung noch nicht erfolgt ist. Warten Sie auf den neuesten Code. Erst ein angenommener Neuversand ersetzt den alten Code; bei Ablehnung bleibt er erhalten. Nach einem Zustellfehler innerhalb der Frist erneut senden oder einen neuen Login beginnen. Login-Versuche gelten fünf, Einrichtungen zehn Minuten. Ein Einrichtungsabbruch betrifft nur diese Einrichtung. Fortsetzen versendet keine neue E-Mail und verlängert keine Frist.

## Rückmeldung zur Neuanforderung

Wenn die erneute Anforderung der aktiven Methode abgeschlossen ist, zeigt die Anmeldemaske ihr Ergebnis. Eine Bestätigung mit dem Status „wartend“ oder „gesendet“ beschreibt den gemeldeten Zustellungsstand. Eine gültige Antwort ohne Bestätigung zeigt nur, dass die Methode geantwortet hat. Ein abgelehntes, fehlerhaftes oder unterbrochenes Ergebnis beweist nicht, ob eine Zustellung erfolgt ist. Prüfen Sie vor einem weiteren Versuch, ob ein Code angekommen ist. Ist der Anmeldeversuch abgelaufen, brechen Sie ihn ab und melden Sie sich erneut an. Wartezeiten bestimmt weiterhin der Server, laufende Anfragen bleiben gesperrt und es erfolgen keine automatischen Wiederholungen oder E-Mail-Sendungen.

Solange eine Neuanforderung offen ist, zeigt die Aktion „Code wird angefordert…“ und einen Beschäftigt-Zustand. Sie bleibt gesperrt, ohne eine neue Frist zu erfinden oder automatisch zu wiederholen. Wird die Neuanforderung während eines Abbruchs fertig und schlägt der Abbruch danach fehl, gleicht dieselbe Maske Ergebnis, Sperre und ausgegebene Frist ab. Eine relative Serverwartezeit beginnt beim Empfang der Antwort; das Warten auf den Abbruch startet sie nicht neu.
