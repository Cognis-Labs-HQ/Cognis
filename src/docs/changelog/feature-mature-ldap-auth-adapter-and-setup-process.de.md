# Zuverlässige LDAP-Verzeichniseinrichtung

## Live-Erkennung für OpenLDAP und FreeIPA

Die LDAP-Einrichtung bindet sich jetzt an das konfigurierte Verzeichnis und liest echte Benutzer und Gruppen, bevor die Konfiguration fortgesetzt wird. Benutzername-Attribute, begrenzte seitenweise Suchen, verschachtelte Mitgliedschaften und sicherere Filter werden unterstützt.

## Klare Rollenzuordnung und Rückschreibesteuerung

Administratoren können jeder Cognis-Rolle eine erkannte LDAP-Gruppe in einer Tabelle zuordnen. Details zur Passwort-Rückschreibung bleiben ausgeblendet, bis die Rückschreibung aktiviert wird.

## Gezielte Verzeichnissuchen und klarere Anmeldeauswahl

Optionale Benutzer- und Gruppen-DNs können LDAP-Suchen eingrenzen; die Basis-DN bleibt der Ersatzwert. Gruppenauswahlen sind alphabetisch sortiert und zeigen kurze Namen. Die Auswahl der Anmeldequelle steht nun vor den Zugangsdatenfeldern und kennzeichnet die aktive Quelle deutlich.
