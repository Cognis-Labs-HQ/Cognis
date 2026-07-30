# Klarere Verbindungstests

## LDAP meldet verständliche Bindefehler

Die LDAP-Einrichtung übersetzt den Verzeichnisfehlercode 0x31 nun in einen Hinweis zur Prüfung von Bind-DN und Passwort, während die genaue Ursache strukturiert im Serverprotokoll bleibt.

## SMTP-Tests verwenden die Zustellwarteschlange

SMTP-Testnachrichten durchlaufen nun die adaptereigene Warteschlange und Ratenbegrenzung. Fehlgeschlagene Tests liefern eine konkrete, hilfreiche Antwort statt eines allgemeinen Anfragefehlers.

## Gespeicherte LDAP-Server lassen sich aktivieren

Authentifizierungsadapter melden ihren Einrichtungsstatus nun über ihren Gateway-Vertrag. Ein vollständig gespeicherter LDAP-Serversatz wird auch dann erkannt, wenn seine Felder und das ausgeblendete Passwort unter `servers` verschachtelt sind.
