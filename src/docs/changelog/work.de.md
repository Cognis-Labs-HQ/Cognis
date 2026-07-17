# Integration namensraum-basierter Medienspeicherung

## Eingefügte Whiteboard-Bilder nutzen Datei-Namensräume

Eingefügte Whiteboard-Bilder werden in den Datei-Namensraum `whiteboards` hochgeladen und als Whiteboard-Bild-URLs gespeichert, statt die vollständige Data-URL direkt im Szenen-Snapshot einzubetten.

## Klassenmaterialien stellen einen Namensraum-Client bereit

Der Klassenadapter bindet und veröffentlicht jetzt seinen `classes`-Namensraum-Client, damit künftige APIs für Klassenmaterialien bereits beim ersten Schreibvorgang denselben namensraum-basierten Dateispeicherpfad verwenden.
