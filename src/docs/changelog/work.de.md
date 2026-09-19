# Zuverlässige soziale SSO-Identitäten und Benachrichtigungen

**Feature-Zweig:** work

## SSO-Handles werden zu Profilidentitäten

Neue SSO-Profile verwenden nun bevorzugt das vom Anbieter gelieferte Handle statt der undurchsichtigen Cognis-Konto-ID, während die Konto-ID der kanonische Eigentümerschlüssel bleibt.

## Benachrichtigungen erreichen SSO-Konten

Der Benachrichtigungsversand löst Profil-Handles zu kanonischen Konto-IDs auf. Benachrichtigungen über Follows, Nachrichten, Reaktionen, Anfragen und Anrufe richten sich nun an diese stabilen Kontoidentitäten.

## Profilabfragen folgen Routen- und Seitenlebenszyklen

Follower-Aktualisierungen verwenden nun die veröffentlichte Route für die Followerliste. Nach dem Abbruch des Navigationssignals einer Seite wird keine Abfrage mehr gestartet.

## Einladungsaktion auf der Benutzerseite wiederhergestellt

Das Registration-Gateway stellt auf der Benutzerseite wieder eine Aktion **+ Einladen** für Eigentümer und berechtigte Gründungsbenutzer bereit. Die Aktion bleibt verborgen, wenn Registrierungstoken nicht verfügbar sind oder die Richtlinie Einladungen untersagt.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/0c20e406
- https://github.com/Cognis-Labs-HQ/Cognis/commit/ce0d316b
