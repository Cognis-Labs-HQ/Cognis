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
