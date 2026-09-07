# Einheitliche Profilavatare

**Feature-Zweig:** feature-enforce-single-source-for-profile-avatars

## Eine profilverwaltete Avatarquelle

Das Laden und die Ersatzdarstellung von Profilavataren sowie die Erzeugung von Initialen und deren Farben erfolgen jetzt über die UI-CTX-Fähigkeit des Profiladapters. UI-Aufrufer fragen diesen Adapterbeitrag direkt über CTX ab, statt eine Profilabstraktion im Core-Reuse einzuführen, sodass Namen überall denselben Avatar erzeugen.

## Verbleibende Aufrufer geprüft

Nachrichten, Kalender, Jitsi Meet, Nextcloud Whiteboard, Teilen, Anwesenheitsanzeigen und Klassenraumavatare erreichen den Profiladapter jetzt ausschließlich über den CTX-Fähigkeit. Der veraltete Re-Export des Social-Gateways wurde entfernt. Ein Regressionstest verhindert neue Initialenimplementierungen, direkte Abrufe von Profildateien und Importe des früheren Anbieters.

## Navbar-Avatar bleibt in Study sichtbar

Das Profil-Navbar-Plugin stellt seinen Avatar-Anbieter jetzt über UI CTX bereit, statt Layout-Zustand zu importieren. Bei der Wiederverwendung der Dashboard-Oberfläche bleibt ein bereits aufgelöster Avatar außerdem während des Ladens der Plugins erhalten, sodass die Navigation zwischen Study-Unterseiten das Profilbild nicht mehr vorübergehend ersetzt.

## Nachrichten laden die Profilbild-Unterstützung vor der Raumdarstellung

Direkt geladene Nachrichtenseiten warten nun auf registrierte Navigationsbeiträge. Dadurch ist die Profilbild-Capability verfügbar, bevor Räume mit Bildern oder Initialen dargestellt werden.

## Study-Klassenräume binden den Profil-UI-Kontext korrekt ein

Klassenraumseiten importieren den UI-Kontext nun als ausführbaren Modulcode, sodass Initialen von Lehrkräften und belegten Plätzen ohne Fehler durch eine fehlende Variable dargestellt werden.

## Änderungen

- [fa7325e](https://github.com/Cognis-Labs-HQ/Cognis/commit/fa7325e7709ea2942c3ce560b033429297e5e8f7)
