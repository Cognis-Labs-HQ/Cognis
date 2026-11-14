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

- https://github.com/Cognis-Labs-HQ/Cognis/commit/62da72d2f6e896ea7d52bf4c1ce7da15802a9966
- https://github.com/Cognis-Labs-HQ/Cognis/commit/0dd00af82a18452217745672bdc5babbf9e817a5
- https://github.com/Cognis-Labs-HQ/Cognis/commit/bf23786bfcdcc5d5f4badcdb205c9438f2401be2
- https://github.com/Cognis-Labs-HQ/Cognis/commit/fe80f98b1ae4030a0dbbd030d7471234aafc0c5b
- https://github.com/Cognis-Labs-HQ/Cognis/commit/f434c53b4d1df2d09e57629266575411b0c51fb3
- https://github.com/Cognis-Labs-HQ/Cognis/commit/8cc2dd723c42a2552ea0653adf1e1ad8f8dd2da2
- https://github.com/Cognis-Labs-HQ/Cognis/commit/b9ee5c17977491ad6621c46fe96bc2a692004bb4
- https://github.com/Cognis-Labs-HQ/Cognis/commit/a2fc0fd084eec300b0f03b6e1a402c72c7918583
- https://github.com/Cognis-Labs-HQ/Cognis/commit/291480ff28497884e7d12a956a5b9dcbcf51a690
- https://github.com/Cognis-Labs-HQ/Cognis/commit/6c63b95a5ca6e1fc792c4e32a6a56f1e9df74b22
- https://github.com/Cognis-Labs-HQ/Cognis/commit/8369fb5aabb552af45f7c222e21c37f739bc2da1
- https://github.com/Cognis-Labs-HQ/Cognis/commit/9863f4d28c62b78bea67e0470a43b148fac6fb4c
