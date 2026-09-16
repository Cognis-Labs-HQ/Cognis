# Zuverlässiger MariaDB-Start

**Feature-Zweig:** feature-mature-mariadb-adapter-to-fix-errors-1xm65i

## MariaDB wird abgewartet

Cognis wiederholt jetzt vorübergehende MariaDB-Verbindungsfehler innerhalb eines begrenzten Startzeitfensters, statt Migrationen während der Datenbankinitialisierung abzubrechen. Die Bereitstellung folgt der neuesten stabilen MariaDB-Container-Version, während die Zustandsprüfung MariaDB eine längere Initialisierungszeit gewährt. Neue Container erzeugen immer ein zufälliges Root-Passwort und aktualisieren die Datenbank-Systemtabellen automatisch; Bereitstellungen akzeptieren kein benutzerdefiniertes Root-Passwort mehr. MariaDB erzeugt jetzt indexierbare Zeichenkettentypen für Fremdschlüsselspalten; außerdem erhält die Schemareparatur für MariaDB und PostgreSQL Einschränkungen und meldet fehlgeschlagene Reparaturen. Das interne Benachrichtigungsschema verwendet jetzt den portablen Bezeichner `is_read`, damit MariaDB die Lesestatusspalte nicht als SQL-Syntax interpretiert. MariaDB behandelt jetzt jede ausdrücklich indexierte Textspalte als indexierbare Zeichenkette und repariert zuvor erstellte `TEXT`-Spalten vor dem Anlegen ihrer Indizes, wodurch Startfehler aufgrund übergroßer Schlüssel vermieden werden. MariaDB konvertiert außerdem ISO-8601-Werte ausschließlich für im Schema deklarierte Zeitstempelspalten. Dadurch werden ungültige `DATETIME`-Werte bei der Registrierung verhindert, ohne Textdaten zu verändern. Auch Schemas aus unstrukturiertem SQL erhalten diesen Schutz: Ein wegen eines Zeitwerts abgelehnter Befehl wird einmal mit normalisierten MariaDB-Zeitwerten wiederholt. Eigenständige Authentifizierungsschema-Executoren mit unstrukturiertem SQL für MariaDB, PostgreSQL und SQLite wurden entfernt. Eine Architekturprüfung erzwingt nun, dass Produktionscode die Wrapper des DB-Gateways verwendet und die Ausführung unstrukturierter Anweisungen auf das DB-Gateway und die Einstiegspunkte der zuständigen Executoren beschränkt bleibt.

## Änderungen

- [34bbe100](https://github.com/Cognis-Labs-HQ/Cognis/commit/34bbe10095d802269dd2beb66b3d30853b459063)
- [43d363ae](https://github.com/Cognis-Labs-HQ/Cognis/commit/43d363ae93b555b6d4bbbc06177aa4c5474f9287)
- [09c787ee](https://github.com/Cognis-Labs-HQ/Cognis/commit/09c787eebba30e4c38fda39b3f0bc60a76028f77)
- [fed2f599](https://github.com/Cognis-Labs-HQ/Cognis/commit/fed2f599a47a100cb3367a25fa637fa720679d76)
- [15ed1e6e](https://github.com/Cognis-Labs-HQ/Cognis/commit/15ed1e6e57bf03459e5b905598c9d8bab227fe2e)
- [3eb5682a](https://github.com/Cognis-Labs-HQ/Cognis/commit/3eb5682a932b611ef3f65357c3d5523037ee7756)
- [31881fb2](https://github.com/Cognis-Labs-HQ/Cognis/commit/31881fb29340bac55ddc78eb149caeec13fa22ae)
