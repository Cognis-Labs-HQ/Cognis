# Größere Profil-Uploads

**Feature-Zweig:** feature-fix-large-file-upload-failure

## Profilmedien folgen Speicherkontingenten

Für Avatar- und Banner-Uploads gilt keine separate Größenobergrenze pro Datei mehr. Große Bilder und animierte GIF-Banner können gespeichert werden, solange der Upload innerhalb des Profil-Namensraum- und globalen Speicherkontingents des Benutzers bleibt.

## Uploads passieren jetzt den Webproxy

Die mitgelieferte nginx-Konfiguration lehnt große API-Anfrageinhalte nicht mehr ab, bevor Cognis die Speicherkontingente des Benutzers anwenden kann. Banner-Uploads behalten außerdem ihre Zuschnittposition beim Speichern der Layout-Einstellung bei.

## Änderungen

- [da55ed2](https://github.com/Cognis-Labs-HQ/Cognis/commit/da55ed2007f45ede24247703d8862de139091ca9)
