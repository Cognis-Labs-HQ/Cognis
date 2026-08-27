# Sicherere LDAP-Konten- und Einrichtungsverwaltung

## Administrative Kontosperren bleiben maßgeblich

LDAP-Profilaktualisierungen behalten jetzt den Aktivierungszustand bestehender Konten bei, sodass eine Anmeldung ein gesperrtes externes Konto nicht erneut aktiviert.

## LDAP-Konfigurationsänderungen können sicher wiederholt werden

Entfernte Authentifizierungsquellen werden abgeglichen, bevor die neue Konfiguration gespeichert wird. Dadurch kann eine fehlgeschlagene Bereinigung erneut versucht werden.

## Einrichtungsfehler und Tastaturaktionen bleiben im richtigen Kontext

Die LDAP-Einrichtung zeigt Serverfehler an den erzeugten Feldern an, belässt Anmeldedatenfehler auf der Anmeldedatenseite und verwendet die Eingabetaste zur Prüfung, ohne den Server vorzeitig zu speichern.
