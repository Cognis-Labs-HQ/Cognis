# Sicherere Schlüsselbundeinrichtung

**Feature-Zweig:** feature-require-password-confirmation-on-keyring-setup

## Neue Schlüsselbundpasswörter bestätigen

Bei der Ersteinrichtung nach der Anmeldung und bei neu erstellten Schlüsselbunden müssen Benutzer ein eigenes Schlüsselbundpasswort wiederholen. Bei abweichenden Eingaben wird die Erstellung verhindert.

## Einheitliche Passwortformulare

Alle Schlüsselbund-Passwortdialoge verwenden jetzt den gemeinsamen Formularkomponisten, kennzeichnen Pflichtfelder eindeutig und wenden einheitliche Validierung und Anordnung an. Das Bestätigungskriterium meldet übereinstimmende Passwörter, wenn das Erfolgszeichen erscheint. Die Aktion „Benutzerpasswort verwenden“ nutzt die bereits bei der Anmeldung bestätigten Zugangsdaten, sodass der Schlüsselbund bei späteren Passwortanmeldungen ohne weitere Abfrage automatisch entsperrt wird. Das Zerstören eines Schlüsselbunds wird vor der Neuerstellung wirksam; bei Abbruch bleibt die Einrichtung erforderlich. Die Stile für Passwortformulare werden jetzt vor dem Öffnen der Schlüsselbunddialoge geladen. Dadurch sind ausgewogene Felder in voller Breite und animierte Prüfkriterien wiederhergestellt. Die Bereinigung gelöschter Kontoschlüsselbunde läuft nach anderen Abhängigkeitsbereinigungen und wird über wiederholte LDAP-Löschzyklen geprüft. Bei der Schlüsselbunderstellung kann jetzt die automatische Sperrfrist gewählt werden. Fehlgeschlagene manuelle Entsperrversuche können ohne Neuladen der Einstellungen wiederholt werden. Nach einer manuellen Zerstörung zeigt die Einstellung „Kein Schlüsselbund gefunden“ und lässt nur die Neuerstellung zu; Entsperrversuche bei der Passwortanmeldung bleiben still und berücksichtigen die festgelegte Sitzungsfrist. Die Einstellungen stellen jetzt vor der Statusanzeige eine noch gültige Entsperrung der Browsersitzung wieder her. Die Bestätigung zum zerstörenden Leeren verwendet einheitlich den Abbruchstil. Fehlgeschlagene manuelle Entsperrversuche bleiben wiederholbar.

## Schlüsselbunde gelöschter Benutzer zurücksetzen

Kontoinstanz-Identitäten unterscheiden gelöschte und neu erstellte Benutzer von noch nicht synchronisierten Schlüsselbunden. Bei Wiederverwendung eines Benutzernamens erscheint die Ersteinrichtung, während ein vorübergehend fehlgeschlagener Upload nicht die einzige verschlüsselte lokale Kopie löschen kann. Der Schlüsselbundzustand im Browser wird gelöscht, wenn die Kontolöschung die aktive Sitzung ungültig macht. Die Behandlung verweigerten Zugriffs nutzt erneut die serverseitige Sitzungsauflösung, damit gelöschte Benutzer „Konto gelöscht“ statt des allgemeinen Hinweises zum Sitzungsablauf sehen.

## Zuverlässige Einrichtungsaktionen

Nach einem Abbruch bleibt die Schlüsselbunderstellung in den Einstellungen bedienbar. Die Auswahlwerte für die automatische Sperre stammen bei Einrichtung und Einstellungen aus derselben Definition, und die Erstellung mit dem Benutzerpasswort verwendet die Darstellung für eine erstellende Aktion.

## Änderungen

- [77460b6](https://github.com/Cognis-Labs-HQ/Cognis/commit/77460b6c93444a0c0c8d467b879551c38dedcc41)
