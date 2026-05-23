# TFA-Gateway & TOTP

## Neues TFA-Gateway
Ein dediziertes `tfa`-Gateway mit Adapter-Erkennung unter `src/adapters/tfa/*`, Benutzer-Methoden-APIs, Recovery-Code-APIs und Admin-Reset-Endpunkten wurde hinzugefügt.

## TOTP-Adapter Hinzugefügt
Ein `totp`-Adapter unter `src/adapters/tfa/totp` mit Setup-Verifizierung und Login-Code-Verifizierung wurde ergänzt.

## Login und Sicherheit Integriert
Login- und Sicherheitsabläufe wurden für Zwei-Faktor-Prompts, erzwungene Setup-Weiterleitungen, TFA-Erzwingung in der Administration und benutzerbezogene TFA-Resets aktualisiert.
