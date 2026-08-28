# Kalenderfreigaben

**Feature Branch:** copilot/fix-calendar-functionality

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

## Kein Kalender-Auswahl-Popup bei Freigabekalendern

Das Annehmen einer Einladung, die bereits in einem freigegebenen Kalender liegt,
öffnet nicht mehr das Popup „Angenommenes Ereignis hinzufügen zu". Die Antwort
wird direkt im Freigabekalender gespeichert.

## Absagen entfernt Teilnehmer dauerhaft

Sagt ein Nutzer ab (auch über „Allen antworten" bei Wiederholungsterminen),
wird er aus der Teilnehmerliste aller betroffenen Termine entfernt. Das Ereignis
erscheint nicht mehr im Kalender oder in ausstehenden Einladungen, bis der
Organisator ihn erneut einlädt.

## Schaltflächen in „Ausstehende Ereignisse" entsprechen dem Reaktions-Popup

Die Schnellantwort-Schaltflächen im Bereich „Ausstehende Ereignisse" verwenden
jetzt denselben Umrandungsstil und dieselbe Hover-Animation wie im
Ereignis-Composer – Grün für Annehmen, Rot für Absagen, neutraler Rahmen für
Vorläufig.

## Sofortige Aktualisierung bei Antwort auf ausstehende Ereignisse

Ein Klick auf eine Schnellantwort-Schaltfläche entfernt den Eintrag sofort aus
der Liste, ohne auf die Netzwerkanfrage zu warten.

## Bevorstehende Ereignisse zeigen keine vergangenen Termine mehr

Ausstehende Kalendereinladungen für Ereignisse, deren Endzeit bereits verstrichen
ist, werden nicht mehr in der Einladungsliste angezeigt. Zuvor konnten vergangene
Ereignisse mit ausstehender Antwort weiterhin im Bereich „Bevorstehend" erscheinen.

## Commits

- [4137bff](https://github.com/Cognis-Labs-HQ/Cognis/commit/4137bffbc99535676bf8d9a32060aa302556c333)
