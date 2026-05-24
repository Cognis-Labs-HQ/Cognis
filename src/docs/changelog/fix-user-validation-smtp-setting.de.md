# SMTP-Validierungsschutz

## SMTP-Benutzervalidierung blockiert, wenn SMTP-Adapter nicht aktiviert ist

Das Dropdown-Menü „Benutzervalidierungsmethode" unter Administration > Sicherheit deaktiviert jetzt die SMTP-Option und kennzeichnet sie als nicht verfügbar, wenn kein aktiver SMTP-Adapter im Benachrichtigungs-Gateway registriert ist. Versucht ein Administrator, die Einstellung über die API zu speichern, während SMTP nicht verfügbar ist, lehnt der Server die Anfrage mit einem expliziten Fehler ab, um zu verhindern, dass eine fehlerhafte Konfiguration gespeichert wird.
