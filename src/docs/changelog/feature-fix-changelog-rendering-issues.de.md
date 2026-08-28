# Vollständige Zusammenfassungen der Versionsänderungen

**Feature Branch:** feature-fix-changelog-rendering-issues

## Details im Versionshinweis anzeigen

Versionshinweise zeigen nun den erklärenden Inhalt unter jeder Änderungsüberschrift an, anstatt nur die Überschriften darzustellen.

## Installierte externe Module einbeziehen

Der Versionsfeed findet nun lokalisierte Changelog-Dateien installierter externer Module und verlinkt jeden Eintrag mit der zugehörigen Modul-Changelog-Seite.

## Verlinkte und gruppierte Changelogs

Überschriften im Versionshinweis verlinken nun direkt auf den vollständigen Cognis-Core-Changelog. Changelogs externer Module zeigen ihr Modul separat an und werden in den vollständigen Changelog-Index aufgenommen.

## Repository-Verweise aktualisiert

Historische Commit-Links verweisen nun auf das aktuelle Cognis-Labs-HQ/Cognis-Repository.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/968c109885b2db1e168a7c62cc29b3c6be3d7b27

## Vollständige Changelog-Herkunft

Automatisierte Prüfungen verlangen nun, dass jeder lokalisierte Changelog seinen Feature-Branch und kanonische Commit-Links angibt. Einträge, die keinem der historischen Repositorys zugeordnet werden können, verwenden ausdrücklich N/A mit einer leeren Commit-Liste.

## Kurze Commit-Referenzen

Die Changelog-Seite zeigt jeden Commit-Link nun als siebenstellige Referenz an, während die vollständige kanonische Commit-URL als Linkziel erhalten bleibt.

## Kurze Referenzen in Hinweisen

Versionshinweis-Popups verwenden nun denselben Formatter für kurze Referenzen wie die vollständige Changelog-Seite und behalten vollständige Commit-URLs als Linkziele bei.
