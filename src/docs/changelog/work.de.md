# Sicherere LDAP-Aktivierung

## Vor der Aktivierung Server konfigurieren

Der Aktivierungsregler des LDAP-Adapters bleibt nun deaktiviert, bis mindestens ein LDAP-Server konfiguriert ist. Dadurch werden ungültige Aktivierungsanfragen verhindert.

Nach dem Hinzufügen eines geprüften Servers speichert die Aktivierung des Adapters die ausstehende Serverkonfiguration automatisch. Das Verwerfen eines noch nicht gespeicherten neuen Servers muss bestätigt werden.

Beim Speichern im Schritt zur Benutzerverifizierung, auch mit der Eingabetaste, wird der Authentifizierungstest nun bei Bedarf automatisch ausgeführt. Nach einem fehlgeschlagenen Authentifizierungstest kehrt die Administration zur Korrektur zu den LDAP-Bindungsfeldern zurück.
