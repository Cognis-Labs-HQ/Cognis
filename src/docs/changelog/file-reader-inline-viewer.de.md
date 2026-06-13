# Inline-Materialanzeige & Chat

## Unterrichtsmaterialien werden direkt im Agenda-Kachel angezeigt

Ausgewählte Unterrichtsmaterialien öffnen und zeigen sich jetzt direkt im Agenda-Bereich. Text- und Markdown-Dateien werden vollständig gerendert. Bilder werden mit Zoom- und Verschiebefunktion angezeigt; der Lehrer steuert die Ansicht, Schüler folgen in Echtzeit.

## Datei-Reader-Gateway und Adapter

Ein neues Datei-Reader-Gateway bietet eine erweiterbare Architektur zur Dateidarstellung. Der Text-Adapter (ehemals Notizblock-Adapter) unterstützt Markdown und Klartext. Ein neuer Bild-Adapter zeigt Bilder mit einem Zeigeereignis-basierten Pan-und-Zoom-Viewer an und überträgt den Lehrerausschnitt über die Unterrichtsraum-Layout-API an die Schüler.

## App-weite Dateitype-Registrierung via CTX

`src/ui/reuse/file-reader.js` stellt `registerFileType`, `canRender`, `renderFileContent` und `showUnsupportedToast` bereit. Adapter registrieren ihre unterstützten Dateitypen beim Start. Versuche, einen nicht unterstützten Typ zu öffnen, werden mit einer Toast-Benachrichtigung quittiert.

## Schüler können jederzeit den Chat-Bereich öffnen

Die Schüler-Interaktionssperre blockiert den Chat-Bereich nicht mehr. Schüler können jederzeit zum Unterrichtschat wechseln.

## Unterrichtschat respektiert die Nachrichtenstil-Einstellung

Das native Chat-Panel wendet jetzt den konfigurierten Nachrichtenstil des Nutzers (z. B. Sprechblasen oder IRC-Stil) konsistent mit der Nachrichten-Seite an.
