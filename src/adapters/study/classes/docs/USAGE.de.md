# Anwendung

Praktische Abläufe für Kurse.

## Voraussetzungen

Melde dich an; Lehr- und Mitgliedschaftsentscheidungen folgen der Lernrichtlinie.

## Beispiele

Wähle eine Klasse und beantrage Zugang; Lehrkräfte bearbeiten Anfragen in ihrer Klassenverwaltung.

Lehrkräfte verwalten ihre Klassen unter `/classes`; angemeldete Lernende sehen ihre Mitgliedschaften unter `/my-classes`. `GET /api/v1/study/classes?language=ja` liefert die passenden Klassen der Lehrkraft, während `GET /api/v1/study/my-classes` die Klassen der angemeldeten lernenden Person liefert.

## Erwartete Ergebnisse

Bestätigte Mitgliedschaft gewährt den erlaubten Lernzugriff der Klasse.

## Fehlerbehebung

Prüfe Lehrberechtigung, Kapazität und Anfragestatus vor erneutem Beantragen.
