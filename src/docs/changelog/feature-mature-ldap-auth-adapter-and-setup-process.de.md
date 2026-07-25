# Zuverlässige LDAP-Verzeichniseinrichtung

## Live-Erkennung für OpenLDAP und FreeIPA

Die LDAP-Einrichtung bindet sich jetzt an das konfigurierte Verzeichnis und liest echte Benutzer und Gruppen, bevor die Konfiguration fortgesetzt wird. Benutzername-Attribute, begrenzte seitenweise Suchen, verschachtelte Mitgliedschaften und sicherere Filter werden unterstützt.

## Klare Rollenzuordnung und Rückschreibesteuerung

Administratoren können jeder Cognis-Rolle eine erkannte LDAP-Gruppe in einer Tabelle zuordnen. Details zur Passwort-Rückschreibung bleiben ausgeblendet, bis die Rückschreibung aktiviert wird.

## Gezielte Verzeichnissuchen und klarere Anmeldeauswahl

Optionale Benutzer- und Gruppen-DNs können LDAP-Suchen eingrenzen; die Basis-DN bleibt der Ersatzwert. Gruppenauswahlen sind alphabetisch sortiert und zeigen kurze Namen. Die Auswahl der Anmeldequelle steht nun vor den Zugangsdatenfeldern und kennzeichnet die aktive Quelle deutlich.

## Anbieterabhängige Kontoaktionen und stabile LDAP-Sitzungen

Jede Anmeldequelle steuert nun ihre eigenen Wiederherstellungsaktionen, sodass der Link für vergessene lokale Passwörter bei ausgewähltem LDAP verschwindet. Passwortänderungen werden nur angeboten, wenn der aktive Anbieter sie unterstützt, bei LDAP also mit aktivierter Rückschreibung. LDAP-Sitzungen benötigen außerdem keinen passenden lokalen Kontodatensatz mehr.

## Dauerhafte externe Kontoidentitäten

Nach einer erfolgreichen LDAP-Anmeldung werden nun zuerst der gemeinsame Kontodatensatz und die LDAP-Identität angelegt, bevor das Profil bereitgestellt wird. Dadurch bleiben die Fremdschlüssel der Datenbank gültig und LDAP-Konten erhalten dieselbe Profil- und Sitzungsgrundlage wie lokale Konten, ohne lokale Passwortzugangsdaten anzulegen.
