# Korrekturen für Gastidentität und Präsenz

## Gastanzeigenamen laden ohne Profilfehler

Share-Gäste erhalten ihren generierten Gastanzeigenamen jetzt über denselben Sitzungsidentitätspfad wie die Dashboard-Shell, sodass Profilabfragefehler für temporäre Benutzer vermieden werden.

## Veraltete Whiteboard-Präsenz wird schnell ausgeblendet

Die Whiteboard-Präsenz ignoriert jetzt Einträge, deren Heartbeat abgelaufen ist, sodass abrupt getrennte Gastsitzungen verschwinden, anstatt als aktive Teilnehmende sichtbar zu bleiben.

## Kollaborative Auswahlindikatoren

Whiteboard-Auswahlen teilen jetzt ausgewählte Objekt-IDs mit anderen aktiven Benutzern, sodass jeder Client diese Objekte direkt im Canvas mit der Präsenzfarbe dieses Benutzers neben der Zeigerpräsenz hervorheben kann.

## Reaktionsfähiges Polling und Toolbar-Präsenz

Präsenzaktualisierungen verwenden jetzt einen adaptiven Polling-Helfer, der nach Aktivität schneller wird und bei Ruhe langsamer wird. Die Whiteboard-Toolbar stellt außerdem einen eigenen Präsenzbereich bereit, der nach einem erneuten Rendern wieder eingehängt wird.

## Textbearbeitung und Verlauf pro Benutzer

Textfelder öffnen jetzt sofort einen sicheren Editor direkt an Ort und Stelle, halten die Überlagerung am verschobenen Canvas ausgerichtet, bieten schwebende Schrift- und Stilsteuerungen und Undo/Redo spielt nur die geänderten Objekte des lokalen Benutzers zurück, damit Mitarbeitende nicht überschrieben werden.
