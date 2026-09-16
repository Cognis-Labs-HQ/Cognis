# Registrierungstoken

Der verpflichtende Registrierungstoken-Adapter verwaltet Einladungs- und Autorisierungstoken für die Kontoerstellung. Er sendet einmalig verwendbare Links über den SMTP-Benachrichtigungsadapter und dient der Benutzerseite als Tokenquelle für Einladungen durch Administratoren und Gründer.

Wenn die öffentliche Registrierung deaktiviert ist, darf eine externe Authentifizierung ein Cognis-Konto nur erstellen, wenn ihre Sitzung ein gültiges Token enthält und die Anbieter-E-Mail mit der eingeladenen E-Mail übereinstimmt. Liefert der Anbieter keine E-Mail, meldet die Kontosperre, dass eine E-Mail-Eingabe erforderlich ist. Ein Abbruch dieser Abfrage oder eine fehlende Autorisierung beendet die Anmeldung, ohne ein Konto zu erstellen.

Das Token wird erst nach dem Speichern des externen Kontos eingelöst; dabei wird die passende Einladungsadresse als verifizierte primäre E-Mail des Kontos gespeichert. Schlägt das Speichern des Kontos oder der E-Mail fehl, bleibt die Einladung nutzbar. Eine Ersatzeinladung ersetzt frühere ausstehende Links erst nach erfolgreicher E-Mail-Zustellung.
