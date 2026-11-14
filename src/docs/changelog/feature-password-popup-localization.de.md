# Gemeinsame Passworttexte

**Feature-Zweig:** feature-password-popup-localization

## Passworttexte teilen

Verschiebt Passwortanforderungen und Übereinstimmungsanzeige in gemeinsame Host-XML-Kataloge und aktualisiert Sicherheit und Registrierung. Sicherheit öffnet das Passwortformular ohne den optionalen Registrierungskatalog. Alle vier Übersetzungen, bestehende Prüfungen und die strikte Auflösung desselben englischen Schlüssels bleiben erhalten.

## Formularverhalten erhalten

Regressionstests prüfen die registrierte Auth-Einstellungskomposition, den tatsächlich eingebundenen Sicherheitsbereich, Dialog, Formularbaukasten und XML-Auflöser sowie die eingebundene Registrierungsseite. Sie decken wiederholtes Öffnen, Abbrechen, erneutes Einbinden, Verwerfen, Sprachwahl, Validierung, synthetischen Erfolg und Fehler sowie fehlende englische Texte ab. Eine Richtlinie mit Nullwerten behält die echte Mindestlänge bei; ein separat eingespeister Fall ohne Kriterien prüft nur einen defensiven Pfad und ist keine unterstützte Serverrichtlinie.

## Kataloge gemeinsam ausliefern

Auth 2.2.13 und Registration 1.2.9 benötigen passende gemeinsame Host-Kataloge. Es gibt keine eigene UI-Paketversion oder Auth-/Registration-Abhängigkeitsgrenze im Lockfile. Integrationen müssen die gemeinsamen Schlüssel verwenden. Keine neuen Abhängigkeiten oder Änderungen an Serverrouten, Passwortrichtlinien oder Authentifizierungsverträgen. Programmatische DOM-Tests belegen weder Browserdarstellung noch die Behebung im bereitgestellten System.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/cc70eac432da743ba23acd4dd091dba3e068b7b9
