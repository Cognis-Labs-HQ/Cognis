# Sprachlernframework (Study Language Framework)

## Überblick

Das Study Language Framework definiert, wie Sprachlerninhalte in Cognis strukturiert, registriert und ausgeliefert werden. Es trennt die Study-Gateway-Infrastruktur von einzelnen Sprachmodulen und trennt die Kernbibliothek einer Sprache (das Referenzregister aller Zeichen, Wörter und Definitionen) von ihren Kindkomponenten (interaktive Lernaktivitäten).

Ein **Sprachmodul** ist ein eigenständiges TypeScript-Paket, das sich beim Bootstrap beim Study Gateway registriert. Es folgt nicht dem Adapter-Muster; stattdessen ist es ein Inhaltsmodul. Das Hinzufügen einer neuen Sprache bedeutet das Hinzufügen eines neuen Modulverzeichnisses — das Study Gateway erkennt es automatisch.

## Verantwortlichkeiten

- Den Vertrag definieren, den jedes Sprachmodul implementieren muss.
- Das Bibliotheks-Datenmodell definieren: das geschichtete Register aus Zeichen, Alt-Zeichen, Definitionen, Wörtern und Sätzen.
- Festlegen, wie Kindkomponenten Sub-Navigationsseiten registrieren.
- Standards bereitstellen, damit Beitragende Zeichen, Wörter oder Lernaktivitäten ohne Kenntnis des gesamten Systems hinzufügen können.

Nicht verantwortlich für: die Erkennung von Adaptern durch das Study Gateway, allgemeines Sitzungs- oder Klassenmanagement.

## Architektur

### Bibliotheks-Datenmodell

Die Bibliothek ist das maßgebliche mehrschichtige Register aller Elemente einer Sprache. Schichten bauen aufeinander auf:

**Schicht 1 — Zeichen (`characters`)**: Die atomaren Schreibeinheiten. Für Japanisch sind das Hiragana und Katakana; nicht Kanji (die gehören in alt_characters). Jedes Zeichen trägt `id`, `symbol`, `romanization` und `category`.

**Schicht 2 — Alt-Zeichen (`alt_characters`)** *(optional)*: Zusammengesetzte oder logografische Symbole. Kanji ist das kanonische Beispiel. Jedes Alt-Zeichen führt `id`, `symbol`, `components` (IDs der Basiszeichen) und `readings`.

**Schicht 3 — Definitionen (`definitions`)**: Ein flacher Speicher von Bedeutungen in einer bestimmten Sprache. Definitionen werden von Wörtern und Sätzen referenziert.

**Schicht 4 — Wörter (`words`)**: Kombinationen von Zeichen oder Alt-Zeichen. Wörter verweisen auf eine oder mehrere Definitionen, sortiert nach Häufigkeit.

**Schicht 5 — Sätze (`sentences`)**: Geordnete Folgen von Wörtern. Ein Satz kann eine explizite Definitionsreferenz tragen oder seine Bedeutung aus den primären Definitionen der enthaltenen Wörter ableiten.

### Kindkomponenten

Eine Kindkomponente ist eine eigenständig lieferbare Lernfunktion für eine bestimmte Sprache. Sie meldet sich über das Sprachmodul an, damit die UI ein Sub-Navigationsmenü aufbauen kann. Kindkomponenten sollten hauptsächlich Schnittstellen zur und von der Bibliothek sein.

### Verzeichnisstruktur

Sprachmodule leben unter `src/modules/study/languages/<code>/`. Kindkomponenten leben unter `components/<id>/` innerhalb des Sprachmoduls.

## API-Routen

| Methode | Pfad                                    | Beschreibung                                       | Auth     |
| ------- | --------------------------------------- | -------------------------------------------------- | -------- |
| GET     | `/api/v1/study/languages`               | Alle verfügbaren Lernsprachen auflisten            | Required |
| GET     | `/api/v1/study/languages/:code/modules` | Kindkomponenten einer Sprache auflisten            | Required |
