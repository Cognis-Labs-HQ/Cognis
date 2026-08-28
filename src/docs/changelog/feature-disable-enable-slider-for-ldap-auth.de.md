# Sicherere LDAP-Aktivierung

**Feature Branch:** feature-disable-enable-slider-for-ldap-auth

## Vor der Aktivierung Server konfigurieren

Der Aktivierungsregler des LDAP-Adapters bleibt nun deaktiviert, bis mindestens ein LDAP-Server konfiguriert ist. Dadurch werden ungültige Aktivierungsanfragen verhindert.

Nach dem Hinzufügen eines geprüften Servers speichert die Aktivierung des Adapters die ausstehende Serverkonfiguration automatisch. Das Verwerfen eines noch nicht gespeicherten neuen Servers muss bestätigt werden.

Beim Speichern im Schritt zur Benutzerverifizierung, auch mit der Eingabetaste, wird der Authentifizierungstest nun bei Bedarf automatisch ausgeführt. Nach einem fehlgeschlagenen Authentifizierungstest kehrt die Administration zur Korrektur zu den LDAP-Bindungsfeldern zurück.

Das Löschen des letzten LDAP-Servers muss nun bestätigt werden und deaktiviert den Adapter. LDAP-Testfehler können alle Konfigurationsfelder hervorheben, die den Fehler verursacht haben könnten, einschließlich Server-URLs, Verzeichnis-DNs, Bindungszugangsdaten und Suchfiltern.

Alle Texte der LDAP-Einrichtung stammen nun aus den lokalisierten Sprachressourcen des Adapters. Erfolgsmeldungen bestätigen die Benutzerauthentifizierung sowie das Erstellen oder Aktualisieren eines LDAP-Servers.

Das Authentifizierungs-Gateway veröffentlicht nun die URL der Sprachressourcen jedes Adapters. Die LDAP-Sprachpakete werden aus dem registrierten statischen UI-Verzeichnis bereitgestellt, damit die Administration sie vor dem Öffnen der Einrichtung lädt.

Beim Testen der LDAP-Benutzerauthentifizierung mit einem leeren Pflichtfeld wird nun eine lokalisierte Fehlermeldung angezeigt. Jeder an den LDAP-Formularkompositor übergebene Beschriftungsschlüssel ist nun ein adaptereigener Lokalisierungsschlüssel.

Das Deaktivieren von LDAP oder Entfernen einer Quelle widerruft nun alle Sitzungen der abhängigen Nutzer. Konten getrennter Quellen werden samt abhängigen Daten gelöscht, während vereinheitlichte Konten erhalten bleiben und bei der nächsten Anmeldung eine aktualisierte Identität einer anderen konfigurierten LDAP-Quelle erhalten können.

Eine lokalisierte Erfolgsmeldung bestätigt nun, wenn „Testen und ermitteln“ erfolgreich eine Verbindung herstellt und LDAP-Verzeichnisdaten zurückgibt.

## Administrative Kontosperren bleiben maßgeblich

LDAP-Profilaktualisierungen behalten jetzt den Aktivierungszustand bestehender Konten bei, sodass eine Anmeldung ein gesperrtes externes Konto nicht erneut aktiviert.

## LDAP-Konfigurationsänderungen können sicher wiederholt werden

Entfernte Authentifizierungsquellen werden abgeglichen, bevor die neue Konfiguration gespeichert wird. Dadurch kann eine fehlgeschlagene Bereinigung erneut versucht werden.

## Einrichtungsfehler und Tastaturaktionen bleiben im richtigen Kontext

Die LDAP-Einrichtung zeigt Serverfehler an den erzeugten Feldern an, belässt Anmeldedatenfehler auf der Anmeldedatenseite und verwendet die Eingabetaste zur Prüfung, ohne den Server vorzeitig zu speichern.

## Commits

- [96257fa](https://github.com/Cognis-Labs-HQ/Cognis/commit/96257fa81b49645e38ae015a12d7433008d903e0)
