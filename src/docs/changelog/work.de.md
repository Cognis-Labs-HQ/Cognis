# Einheitliche Profilavatare

## Eine profilverwaltete Avatarquelle

Das Laden und die Ersatzdarstellung von Profilavataren sowie die Erzeugung von Initialen und deren Farben erfolgen jetzt über die UI-CTX-Fähigkeit des Profiladapters. Gemeinsame UI-Aufrufer delegieren an diese Fähigkeit, statt konkurrierende Implementierungen zu pflegen, sodass Namen überall denselben Avatar erzeugen.

## Verbleibende Aufrufer geprüft

Nachrichten, Kalender, Jitsi Meet, Nextcloud Whiteboard, Teilen, Anwesenheitsanzeigen und Klassenraumavatare erreichen den Profiladapter jetzt ausschließlich über den gemeinsamen CTX-Client. Der veraltete Re-Export des Social-Gateways wurde entfernt. Ein Regressionstest verhindert neue Initialenimplementierungen, direkte Abrufe von Profildateien und Importe des früheren Anbieters.

## Navbar-Avatar bleibt in Study sichtbar

Das Profil-Navbar-Plugin stellt seinen Avatar-Anbieter jetzt über UI CTX bereit, statt Layout-Zustand zu importieren. Bei der Wiederverwendung der Dashboard-Oberfläche bleibt ein bereits aufgelöster Avatar außerdem während des Ladens der Plugins erhalten, sodass die Navigation zwischen Study-Unterseiten das Profilbild nicht mehr vorübergehend ersetzt.
