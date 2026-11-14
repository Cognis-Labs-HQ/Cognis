# Zuverlässige Gespräche

**Feature-Zweig:** feature-messages-async-ownership

## Das ausgewählte Gespräch aktuell halten

Verspätete Gesprächsaktualisierungen ersetzen nicht mehr die letzte Auswahl. Ausstehende Aktualisierungen von Kopfzeile, Nachrichten, Schlüsseln und Aktionen enden, sobald ihre Ansicht nicht mehr aktuell ist.

## Entwürfe und Sendeergebnisse erhalten

Nach Bestätigung oder dauerhafter Einreihung wird nur die abgesendete Entwurfsversion gelöscht. Neuere Änderungen und Entwürfe des ursprünglichen Gesprächs bleiben bei Gesprächswechseln erhalten. Doppeltes Absenden bleibt während des Sendens gesperrt. Ein Fehler bei der Aktualisierung meldet, dass die Nachricht gesendet oder eingereiht wurde, statt zum erneuten Senden aufzufordern.

## Ungelesen-Anzeigen korrekt halten

Fehlgeschlagene Lesestatusbestätigungen lassen Ungelesen-Anzeigen unverändert und zeigen übersetzte Hinweise ohne wiederholte Meldungen während desselben Fehlers. Die Anleitung erklärt das Schreiben des nächsten Entwurfs während des Sendens.

Der gemeinsame Entwurfsmanager akzeptiert eine optionale Auflösung des Ressourcenpfads. Nachrichten verwendet beim Lesen, Speichern und Löschen von Entwürfen den ursprünglichen Raumpfad. Andere Seiten behalten den aktuellen Seitenpfad bei; alle Entwürfe bleiben kontogebunden.

## Verspätete Fehler zuordnen

Fehlgeschlagene Hintergrundaktualisierungen zeigen einen lokalisierten Hinweis und bewahren die aktuellen Entwürfe. Wiederholte Fehler werden protokolliert; der Hinweis erscheint erst nach einer erfolgreichen Aktualisierung oder der Auswahl eines anderen Gesprächs erneut. Verspätete Fehler aus einem verlassenen Raum oder Konto können keine veralteten Sendefehler anzeigen, weitere Lesevorgänge starten oder das aktuelle Gespräch unterbrechen. Auch das Verlassen und erneute Öffnen von Nachrichten beendet ausstehende Aktualisierungen der alten Ansicht.

Reaktionsänderungen und das Laden älterer Nachrichten bleiben an das Gespräch gebunden, in dem sie begonnen wurden. Aktuelle Fehler zeigen einen übersetzten Hinweis und werden ohne Nachrichteninhalte protokolliert. Fehler aus einem verlassenen Gespräch, Konto oder einer verlassenen Seite werden ignoriert. Diese Aktionen werden nicht automatisch wiederholt. Die Vorschau-Anleitung behandelt Formatierung, Links und Zeilenumbrüche, keine Anhänge.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/d8e546ce544f6c9bd5bae4c680df2e19c8a44b69
