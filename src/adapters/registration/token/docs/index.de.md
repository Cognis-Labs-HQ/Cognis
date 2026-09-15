# Registrierungstoken

Der verpflichtende Registrierungstoken-Adapter verwaltet Einladungs- und Autorisierungstoken für die Kontoerstellung. Er sendet einmalig verwendbare Links über den SMTP-Benachrichtigungsadapter und dient der Benutzerseite als Tokenquelle für Einladungen durch Administratoren und Gründer.

Wenn die öffentliche Registrierung deaktiviert ist, darf eine externe Authentifizierung ein Cognis-Konto nur erstellen, wenn ihre Sitzung ein gültiges Token enthält und die Anbieter-E-Mail mit der eingeladenen E-Mail übereinstimmt. Liefert der Anbieter keine E-Mail, meldet die Kontosperre, dass eine E-Mail-Eingabe erforderlich ist. Ein Abbruch dieser Abfrage oder eine fehlende Autorisierung beendet die Anmeldung, ohne ein Konto zu erstellen.
