# Klarere Verbindungstests

## LDAP meldet verständliche Bindefehler

Die LDAP-Einrichtung übersetzt den Verzeichnisfehlercode 0x31 nun in einen Hinweis zur Prüfung von Bind-DN und Passwort, während die genaue Ursache strukturiert im Serverprotokoll bleibt.

## SMTP-Tests verwenden die Zustellwarteschlange

SMTP-Testnachrichten durchlaufen nun die adaptereigene Warteschlange und Ratenbegrenzung. Fehlgeschlagene Tests liefern eine konkrete, hilfreiche Antwort statt eines allgemeinen Anfragefehlers.
