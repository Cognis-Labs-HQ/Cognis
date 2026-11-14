# Privilegierte Kontogrenzen

**Feature-Zweig:** feature-auth-tfa-target-policy

## Kontoziele schützen

Vereinheitlicht die Autorisierung privilegierter Konten in Auth und prüft jeden kontenübergreifenden TFA-Lesezugriff und jede Änderung, einschließlich Wiederherstellungscode-Wechsel und Administrator-Zurücksetzung. Eigentümerrechte und Selbstverwaltung bleiben erhalten; fehlende Richtlinien, unbekannte Konten und veraltete Lebensdauern werden abgelehnt. Die Benutzerverwaltung verwendet denselben Vertrag und behält ihre aktionsbezogenen Einschränkungen.

## Vertrag des Anbieters prüfen

Prüft die echte gestufte Richtlinie und registrierte Routen mit synthetischen Rollen, Gründermerkmalen, fehlenden Zielen, fehlerhaften Eingaben, Vertragsfehlern und verzögerten Lebensdaueränderungen. Synchronisiert Auth 2.2.12, TFA 1.3.13 und API 0.13.36 mit Integrationshinweisen in vier Sprachen.

## Vor Änderungen erneut prüfen

Users fragt die Berechtigung nach der Anfragevorbereitung und Auth vor dem ersten Deprovisionierungseffekt erneut ab. Die Akteuridentität bleibt unveränderlich; späte Rollen- und Gründeränderungen sowie abgelaufene Lebensdauern werden abgelehnt. Zulässige Beförderungen zum Administrator schließen die Profilsynchronisierung ab. LDAP-Systemabgleich und Grenzen bei Teilergebnissen bleiben dokumentiert. Dauerhafte Tests decken verzögerte Anfragen, Metadaten, Flow-Stufen und ungültige Prüfwerte ab.

Fehler bei TFA-Einrichtung und Users-Rollenänderung verwenden vorhandene lokalisierte Ersatzmeldungen, statt beliebige Servercodes als Übersetzungsschlüssel oder rohe Richtliniencodes anzuzeigen. Bestehende Tutorials benötigen keine neuen Bedienelemente oder Schritte.

## Bereinigungsergebnisse authentifizieren

Auth bindet Deprovisionierungsnachweise an ursprüngliche Eingabe und Aufruf; Users und alle gebündelten Bereinigungsverbraucher verlangen diese Eigentümerergebnisse. Gefälschte spätere Stufenergebnisse und aufrufübergreifende Wiederholung werden ohne erneute Berechtigungsprüfung bereits erfolgter Änderungen abgelehnt. Komponentenversionen, getestete Abhängigkeitsgrenzen und viersprachige Bereitstellungshinweise werden aktualisiert. Der geprüfte ältere Jitsi-Companion bleibt eine Bereitstellungsabhängigkeit: Sein Bereinigungshook muss umgestellt oder deaktiviert werden, bevor die Installation als geschützt gilt.

## Aufrufkontexte bewahren

Core 0.6.6 friert die bereits als schreibgeschützt deklarierten Flow-Kontextreferenzen flach ein; veränderliche Eingabe-, Daten- und Ergebnisinhalte sowie die Stufenreihenfolge bleiben erhalten. Auth prüft diese Laufzeitgarantie und lehnt alte Runner ab. Tests decken wiederverwendete Aufrufpaare, gemischte Versionen und den echten generischen Runner ab. Alle 23 getesteten Core-Grenzen werden aktualisiert und die öffentliche Workspace-Auflösung geprüft. Statische Repository- und Companion-Prüfungen fanden keine unterstützten Zuweisungen oberster Kontextreferenzen.

## Commits

- [305b4b3cb7a6024a690ddde78d708675932b532d](https://github.com/Cognis-Labs-HQ/Cognis/commit/305b4b3cb7a6024a690ddde78d708675932b532d)
