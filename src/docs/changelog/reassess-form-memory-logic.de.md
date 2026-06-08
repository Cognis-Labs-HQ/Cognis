# Formularspeicher-Korrekturen

## Rollen-Dropdowns von der Formular-Entwurfsspeicherung ausgenommen

Die Rollen-Auswahlfelder auf der Benutzerseite werden nun von der Formular-Entwurfsspeicherung des Seitenkomponisten ausgenommen. Zuvor konnte ein erneutes Rendern der Benutzertabelle veraltete Rollenwerte aus dem Entwurfsspeicher in die Dropdowns zurückschreiben und so den aktuellen serverseitigen Zustand verschleiern.

## Raumspezifische Nachrichtenentwürfe

Der Nachrichtenkomponist speichert nun einen Entwurf pro Raum, verschlüsselt nach Konto und Raum-ID. Wenn Text in einem Raum eingegeben wird, in einen anderen Raum gewechselt und zurückgekehrt wird, wird der vorherige Entwurf wiederhergestellt. Das Senden einer Nachricht löscht den Entwurf für diesen Raum. Damit wird das bisherige Verhalten ersetzt, bei dem Text im Komponisten raumübergreifend erhalten blieb, unabhängig davon, für welchen Raum er gedacht war.
