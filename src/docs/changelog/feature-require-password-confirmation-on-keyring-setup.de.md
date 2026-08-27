# Sicherere Schlüsselbundeinrichtung

## Neue Schlüsselbundpasswörter bestätigen

Bei der Ersteinrichtung nach der Anmeldung und bei neu erstellten Schlüsselbunden müssen Benutzer ein eigenes Schlüsselbundpasswort wiederholen. Bei abweichenden Eingaben wird die Erstellung verhindert.

## Einheitliche Passwortformulare

Alle Schlüsselbund-Passwortdialoge verwenden jetzt den gemeinsamen Formularkomponisten, kennzeichnen Pflichtfelder eindeutig und wenden einheitliche Validierung und Anordnung an. Das Bestätigungskriterium meldet übereinstimmende Passwörter, wenn das Erfolgszeichen erscheint. Die Aktion „Benutzerpasswort verwenden“ nutzt die bereits bei der Anmeldung bestätigten Zugangsdaten, sodass der Schlüsselbund bei späteren Passwortanmeldungen ohne weitere Abfrage automatisch entsperrt wird. Das Zerstören eines Schlüsselbunds wird vor der Neuerstellung wirksam; bei Abbruch bleibt die Einrichtung erforderlich. Die Stile für Passwortformulare werden jetzt vor dem Öffnen der Schlüsselbunddialoge geladen. Dadurch sind ausgewogene Felder in voller Breite und animierte Prüfkriterien wiederhergestellt. Die Bereinigung gelöschter Kontoschlüsselbunde läuft nach anderen Abhängigkeitsbereinigungen und wird über wiederholte LDAP-Löschzyklen geprüft. Bei der Schlüsselbunderstellung kann jetzt die automatische Sperrfrist gewählt werden. Fehlgeschlagene manuelle Entsperrversuche können ohne Neuladen der Einstellungen wiederholt werden. Nach einer manuellen Zerstörung zeigt die Einstellung „Kein Schlüsselbund gefunden“ und lässt nur die Neuerstellung zu; Entsperrversuche bei der Passwortanmeldung bleiben still und berücksichtigen die festgelegte Sitzungsfrist. Die Einstellungen stellen jetzt vor der Statusanzeige eine noch gültige Entsperrung der Browsersitzung wieder her. Die Bestätigung zum zerstörenden Leeren verwendet einheitlich den Abbruchstil. Fehlgeschlagene manuelle Entsperrversuche bleiben wiederholbar.

## Schlüsselbunde gelöschter Benutzer zurücksetzen

Nach dem Löschen eines Benutzers ist der leere Schlüsselbundzustand des Servers maßgeblich. Wird der Benutzername erneut verwendet, erscheint die Ersteinrichtung statt einer alten verschlüsselten Browserkopie. Der Schlüsselbundzustand im Browser wird jetzt gelöscht, wenn die Kontolöschung die aktive Sitzung ungültig macht. Die Behandlung verweigerten Zugriffs nutzt erneut die serverseitige Sitzungsauflösung, damit gelöschte Benutzer „Konto gelöscht“ statt des allgemeinen Hinweises zum Sitzungsablauf sehen.
