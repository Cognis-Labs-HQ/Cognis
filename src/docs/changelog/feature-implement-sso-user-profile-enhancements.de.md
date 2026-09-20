# Verbesserte externe Profile

**Feature-Zweig:** feature-implement-sso-user-profile-enhancements

## Stabile externe Konten

Externe Identitäten werden vor Registrierung, Speicherung, Token-Ausgabe und Profilerstellung einem einzigen kanonischen, anbieterbezogenen lokalen Konto zugeordnet. Aufgelöste Namen halten Konten wie `x:firehawksystems`, `line:firehawksystems` und das lokale `firehawksystems` getrennt.

## Sicherer Identitätslebenszyklus

Beim Löschen eines externen Kontos wird vor dem Entfernen der Kontodaten ein nicht umkehrbarer Identitätsfingerabdruck gespeichert. Eine spätere erfolgreiche Anbieterauthentifizierung kann diesen Löschvermerk bei der Neuerstellung des anbieterbezogenen Kontos transaktional entfernen; fehlgeschlagene Authentifizierung und Registrierungsbestätigungen verändern den Löschzustand nicht.

## Anbieterprofilerlebnis

Die Administration zeigt aufgelöste Namen und Anbietersymbole für externe Konten. Benutzer können über das Profilbanner eine Aktualisierung des Anbieterprofils anfordern, und Cognis speichert zurückgegebene Profilmedien, statt entfernte Bilder wiederholt zu laden.

## Profilsichtbarkeit des Anbieters

Externe Authentifizierungssitzungen und aufgelöste Profile können `profileVisibility` zurückgeben. Cognis prüft unterstützte Werte und speichert die gewünschte Sichtbarkeit nach der Profilerstellung oder Synchronisierung.

## Klare Moduleinrichtung

Module können lokalisierte Aktivierungshinweise mit Adapterzielen deklarieren. Nach der Aktivierung zeigt Cognis anbieterneutrale nächste Schritte und kann Administratoren direkt zum passenden Administrationsbereich führen.

## Bessere Registrierungsoptionen

Die Administration zeigt Registrierungs- und Einladungsrichtlinien als kompakte Ja- oder Nein-Optionsgruppen. Der gemeinsame Formular-Composer und die Änderungsverfolgung verwalten Speichern und Verwerfen einheitlich; erforderliche Optionsgruppen bleiben bis zur Auswahl ungültig.

## Isolierte Profilsynchronisierung

Die externe Profilsynchronisierung wird pro Anbieter registriert, sodass Cognis sie nur für den Anbieter anbietet und ausführt, der das aktuelle Konto authentifiziert hat. Ersetzte Objekt-URLs für Avatar und Banner werden widerrufen, damit veraltete Medien nicht im Browserspeicher verbleiben.

## Konformität und Sicherheit

Kontonamensräume werden vor der Suche geprüft, fehlgeschlagene Kontoerstellungs-Rollbacks erzeugen keine Löschvermerke, die Profilsynchronisierung verwendet die Gestaltung für destruktive Aktionen, und betroffene Komponentenversionen sowie Abhängigkeitsobergrenzen bleiben abgestimmt.

## Commits

- [e852d7df](https://github.com/Cognis-Labs-HQ/Cognis/commit/e852d7df7c3eef240000095422fafdad6d716042)
- [69ba8037](https://github.com/Cognis-Labs-HQ/Cognis/commit/69ba80376c9eee932299c8ae9f49f86819f77a0d)
- [dac7a3c5](https://github.com/Cognis-Labs-HQ/Cognis/commit/dac7a3c55115a645ca04a63d7a336e88c69c7673)
- [3691212d](https://github.com/Cognis-Labs-HQ/Cognis/commit/3691212d5088e503900b8a9f3aab8c6c1f375840)
- [72389da5](https://github.com/Cognis-Labs-HQ/Cognis/commit/72389da57f5713401c14521893e8f0f1c540cfc7)
- [bbc6a993](https://github.com/Cognis-Labs-HQ/Cognis/commit/bbc6a9937ec55eb7959d2f788976bee62c222a86)
- [5282575c](https://github.com/Cognis-Labs-HQ/Cognis/commit/5282575c57d00af6665f5c2d4ae3a9e265b870da)
- [d758074a](https://github.com/Cognis-Labs-HQ/Cognis/commit/d758074ac7dae7bfaaebf4dfd956096a6679e566)
- [6e383065](https://github.com/Cognis-Labs-HQ/Cognis/commit/6e3830656f89213880dbcb4429ff44239f2c2bbf)
- [b7423a46](https://github.com/Cognis-Labs-HQ/Cognis/commit/b7423a46e20c3a4cc795eebc3ff4aa765ede7fa4)
- [fbbbfda6](https://github.com/Cognis-Labs-HQ/Cognis/commit/fbbbfda628ce7aed65235b1b071b921c906dd79d)
- [c5a50d8d](https://github.com/Cognis-Labs-HQ/Cognis/commit/c5a50d8d4728d861e69a72e840da64ec64850b82)
