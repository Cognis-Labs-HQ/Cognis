# Sicherere LDAP-Aktivierung

## Vor der Aktivierung Server konfigurieren

Der Aktivierungsregler des LDAP-Adapters bleibt nun deaktiviert, bis mindestens ein LDAP-Server konfiguriert ist. Dadurch werden ungültige Aktivierungsanfragen verhindert.

Nach dem Hinzufügen eines geprüften Servers speichert die Aktivierung des Adapters die ausstehende Serverkonfiguration automatisch. Das Verwerfen eines noch nicht gespeicherten neuen Servers muss bestätigt werden.

Beim Speichern im Schritt zur Benutzerverifizierung, auch mit der Eingabetaste, wird der Authentifizierungstest nun bei Bedarf automatisch ausgeführt. Nach einem fehlgeschlagenen Authentifizierungstest kehrt die Administration zur Korrektur zu den LDAP-Bindungsfeldern zurück.

Das Löschen des letzten LDAP-Servers muss nun bestätigt werden und deaktiviert den Adapter. LDAP-Testfehler können alle Konfigurationsfelder hervorheben, die den Fehler verursacht haben könnten, einschließlich Server-URLs, Verzeichnis-DNs, Bindungszugangsdaten und Suchfiltern.

Alle Texte der LDAP-Einrichtung stammen nun aus den lokalisierten Sprachressourcen des Adapters. Erfolgsmeldungen bestätigen die Benutzerauthentifizierung sowie das Erstellen oder Aktualisieren eines LDAP-Servers.

Das Authentifizierungs-Gateway veröffentlicht nun die URL der Sprachressourcen jedes Adapters. Die LDAP-Sprachpakete werden aus dem registrierten statischen UI-Verzeichnis bereitgestellt, damit die Administration sie vor dem Öffnen der Einrichtung lädt.
