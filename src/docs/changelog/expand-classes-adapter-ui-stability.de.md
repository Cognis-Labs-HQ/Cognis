# Stabilitätsverbesserungen der Unterrichts-UI

## Flüssige Kachel- und Tab-Animationen bei dynamischer Aktualisierung

Die dynamische Echtzeit-Aktualisierung setzt nun keine aktiven Kachel- oder Tab-Kopfzeilenanimationen mehr zurück. Arbeitsbereichs-Kacheln werden im DOM nur dann umsortiert, wenn sich ihre Reihenfolge tatsächlich geändert hat, sodass laufende CSS-Animationen auf aktiven Kacheln nicht durch einen Hintergrundpoll unterbrochen werden.

## Fokus des Chat-Eingabefelds bleibt bei Aktualisierung erhalten

Die Eingabe in das Unterrichts-Chat-Eingabefeld verliert nun keinen Fokus mehr, wenn der Unterrichtsraum im Hintergrund aktualisiert wird. Das aktive Element des Browsers wird vor jeder DOM-Ersetzung gespeichert und danach wiederhergestellt, sodass Cursorposition und Eingabestatus erhalten bleiben.

## Whiteboard-Tab ausgeblendet, wenn Modul nicht konfiguriert ist

Der Whiteboard-Tab im Unterrichts-Schwatzbrett wird jetzt davon gesteuert, ob das Nextcloud-Whiteboard-Modul tatsächlich auf dem Server konfiguriert ist. Der Snapshot-Endpunkt liefert nun ein `whiteboardEnabled`-Flag, und die UI nutzt dieses, um den Tab vollständig wegzulassen, wenn das Modul fehlt, anstatt ihn dauerhaft deaktiviert anzuzeigen.

## Unterrichtsmaterialien werden nun in einem eingebetteten Viewer geöffnet

PDF- und Bild-Unterrichtsmaterialien werden nun wie erwartet in einem eingebetteten Viewer angezeigt. Zwei zugrunde liegende Probleme wurden behoben: eine Race-Condition, bei der der Echtzeit-Poll einen frisch ausgewählten Material-Schlüssel überschreiben konnte, bevor er auf dem Server gespeichert wurde, sowie eine fehlende vollständige DOM-Aktualisierung, die verhinderte, dass die Material-Viewer-Kachel aktualisiert wurde, wenn ein Lehrer ein neues Material an Schüler überträgt.
