# Kalenderfreigaben

## Mehrere Links sind wieder da

Das Kalender-Popup behält jetzt alle erzeugten Freigabelinks, statt nur das
neueste Ergebnis zu zeigen. Jeder Eintrag erscheint als eigener einklappbarer
Block mit Linknamen sowie getrennten CalDAV- und ICS-Kopierfeldern, damit sich
mehrere Feeds übersichtlich verwalten lassen.

## Private Links erhalten Passphrasen

Private Kalenderfreigaben erzeugen jetzt pro Link eine eigene Passphrase. Das
Popup zeigt diese Passphrase neben den Export-URLs an, und die Freigabe-Endpunkte
akzeptieren sie für CalDAV- und ICS-Zugriffe ohne Cognis-Bearer-Token.

## Freigabelinks laufen wieder ab

Erzeugte Links beachten wieder die gewählte Ablaufzeit und werden nach diesem
Zeitpunkt deaktiviert. Auch öffentliche Kalender erzeugen nun eigene
Freigabe-URLs, sodass jeder erzeugte Eintrag unabhängig ablaufen kann.

## Freigegebene Nutzerkarten passen zu den neuen Bedienelementen

Jeder Eintrag für freigegebene Nutzer hält Profilkarte, Berechtigungswahl und
Ablaufwahl jetzt in einer Zeile und zeigt oben rechts eine kompakte Schließen-
Schaltfläche. Berechtigungsänderungen senden nur noch das tatsächlich geänderte
Feld, wodurch der Bad-Request-Fehler beim Umschalten zwischen Nur-Lesen und
Lesen/Schreiben verschwindet.

## Veraltete Freigabekalender werden sofort bereinigt

Wird eine Kalenderfreigabe gelöscht oder abläuft, verschwindet der freigegebene
Kalender beim nächsten Aktualisieren aus der Liste des Empfängers. Bei jedem
Laden führt ein Handshake einen Abgleich durch und entfernt Einträge, deren
Freigabedatensatz nicht mehr existiert.

## Berechtigungsänderungen bleiben bei erneuter Freigabe erhalten

Wird ein bereits freigegebener Nutzer erneut hinzugefügt, wird eine erhöhte
Berechtigung nicht mehr auf Nur-Lesen zurückgesetzt. Die vorhandene Berechtigung
bleibt bestehen, sodass ein Besitzer einen Nutzer gefahrlos erneut einladen kann,
ohne eine zuvor vergebene Schreibberechtigung zu verlieren.

