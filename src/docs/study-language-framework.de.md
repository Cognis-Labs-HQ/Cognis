# Lernsprachenrahmen

## Übersicht

Das Study Language Framework definiert, wie Sprachlerninhalte in Cognis strukturiert, registriert und bereitgestellt werden. Es bietet eine mehrschichtige Architektur, die das Studien-Gateway (Infrastruktur) von einzelnen Sprachmodulen (Inhalt) trennt und die Kernbibliothek jeder Sprache (die kanonische Referenz jedes Zeichens, Wortes und jeder Definition in der Sprache) von ihren untergeordneten Komponenten (interaktive Lernaktivitäten) trennt.

Ein **Sprachmodul** ist ein eigenständiges TypeScript-Paket, das sich beim Bootstrap beim Study Gateway registriert. Es folgt nicht dem Adaptermuster, das von Infrastrukturunternehmen wie der Datenbank oder dem Benachrichtigungssystem verwendet wird. Stattdessen handelt es sich um ein Inhaltsmodul, dessen Hauptaufgabe darin besteht, die Sprachbibliothek zu füllen und verfügbar zu machen und ihre untergeordneten Komponenten anzukündigen, damit die Benutzeroberfläche zu ihnen navigieren kann. Das Hinzufügen einer neuen Sprache bedeutet das Hinzufügen eines neuen Modulverzeichnisses. Das Study Gateway erkennt es automatisch.

Das Framework ist granular konzipiert. Mitwirkende können eine Sprache erweitern, indem sie eine einzelne untergeordnete Komponente hinzufügen (z. B. ein Hiragana-Quiz, einen Kanji-Strichreihenfolge-Viewer), ohne das Kernsprachenmodul zu berühren. Jede untergeordnete Komponente registriert selbst einen Unternavigationseintrag, der unter der Studienseite angezeigt wird, wenn der Benutzer diese Sprache auswählt.

## Verantwortlichkeiten

- Definieren Sie den Vertrag, den jedes Sprachmodul implementieren muss.
- Definieren Sie das Bibliotheksdatenmodell: das geschichtete Register von Zeichen, alternativen Zeichen, Definitionen, Wörtern und Sätzen.
- Definieren Sie, wie untergeordnete Komponenten Unternavigationsseiten registrieren und in die Bibliothek integrieren.
  – Geben Sie an, wie das Study Gateway Sprachmodule erkennt und sie der Benutzeroberfläche zur Verfügung stellt.
- Stellen Sie Standards bereit, damit Mitwirkende Zeichen, Wörter oder Lernaktivitäten hinzufügen können, ohne das gesamte System zu verstehen.

Nicht verantwortlich für: wie das Study Gateway Adapter erkennt (was in den Gateway-Dokumenten dokumentiert ist), allgemeine Sitzungs- oder Klassenverwaltung (das ist der Klassenadapter) oder Lehreranfrage-Workflows.

## Architektur

### Der Sprachmodulvertrag

Jedes Sprachmodul exportiert zwei benannte Funktionen:

```ts
export function createLanguageModule(): LanguageModule | null;
export async function bootstrapLanguageModule(
    ctx: LanguageModuleBootstrapCtx,
): Promise<void>;
```

`createLanguageModule` wird während der Adaptererkennung aufgerufen, damit das Gateway seine Sprachregistrierung vor dem vollständigen Bootstrap schnell füllen kann. Geben Sie `null` zurück, um sich ordnungsgemäß abzumelden (z. B. wenn eine erforderliche Umgebungsvariable fehlt).

`bootstrapLanguageModule` wird während der Bootstrap-Phase aufgerufen und empfängt ein Kontextobjekt, über das das Modul Routen, untergeordnete Komponenten und statische Assets registriert.

Die `LanguageModule`-Schnittstelle:

```ts
interface LanguageModule {
    readonly languageCode: string; // BCP 47 code, e.g. 'ja', 'ko', 'zh-TW'
    readonly languageName: string; // Human-readable name in the language itself
    readonly languageFlag: string; // Emoji flag, e.g. '🇯🇵'
    readonly version: string; // Semver
    listChildComponents(): LanguageChildComponent[];
}
```

### Das Bibliotheksdatenmodell

Die Bibliothek ist das maßgebliche mehrschichtige Register aller Dinge in einer Sprache. Schichten bauen von unten nach oben aufeinander auf:

**Ebene 1 – Zeichen (`characters`)**
Die atomaren Schreibeinheiten der Sprache. Für Japaner sind dies Hiragana und Katakana; für Koreanisch, jamo. Enthält KEINE zusammengesetzten Symbole wie Kanji (diese gehören zu alt_characters). Jeder Charakter trägt:

```ts
interface Character {
    id: string; // Stable unique identifier, e.g. 'ja:char:a'
    symbol: string; // The rendered glyph, e.g. 'あ'
    romanization?: string; // Standard romanization, e.g. 'a'
    category?: string; // Grouping within the script, e.g. 'hiragana', 'katakana'
}
```

**Ebene 2 – Alternative Zeichen (`alt_characters`)** _(optional)_
Zusammengesetzte oder logografische Symbole, die von Basiszeichen abgeleitet sind. Kanji sind das kanonische Beispiel: Jedes Kanji kann einem oder mehreren Basiszeichen oder einer Kombination von Basiszeichen zugeordnet werden. Jedes alt_character trägt:

```ts
interface AltCharacter {
    id: string; // Stable unique identifier, e.g. 'ja:kanji:日'
    symbol: string; // The rendered glyph, e.g. '日'
    components: string[]; // IDs of constituent characters or other alt_characters
    readings?: string[]; // Romanized or phonetic readings, e.g. ['nichi', 'jitsu', 'hi']
}
```

**Schicht 3 – Definitionen (`definitions`)**
Ein flacher Bedeutungsspeicher. Eine Definition ist eine kurze Phrase oder ein kurzer Satz in einer bestimmten Sprache (der _Definitionssprache_, typischerweise der UI-Sprache des Lernenden), der ein Konzept beschreibt. Definitionen werden von Wörtern und Sätzen referenziert und nicht in sie eingebettet, sodass eine einzelne Definition von mehreren Wörtern gemeinsam genutzt werden kann.

```ts
interface Definition {
    id: string; // Stable unique identifier
    text: string; // The definition text
    language: string; // BCP 47 code of the definition language, e.g. 'en'
}
```

**Ebene 4 – Wörter (`words`)**
Kombinationen aus einem oder mehreren Zeichen oder alt_characters, die eine sinnvolle Einheit bilden. Wörter werden einer oder mehreren Definitionen zugeordnet, die nach Gemeinsamkeit geordnet sind, sodass ein unauffälliger Zug immer zuerst die häufigste Bedeutung zurückgibt.

```ts
interface Word {
    id: string; // Stable unique identifier, e.g. 'ja:word:nihon'
    graphemes: string[]; // Ordered list of character/alt_character IDs
    definitionIds: string[]; // Ordered by commonality (primary first)
    reading?: string; // Romanized reading of the whole word
    jlptLevel?: string; // Optional proficiency tag, e.g. 'N5'
}
```

**Schicht 5 – Sätze (`sentences`)**
Geordnete Wortfolgen. Ein Satz kann eine explizite Definitionsreferenz enthalten (eine maßgeschneiderte Definition, die nur für diesen Satz geschrieben wurde) oder er kann seine Bedeutung durch Verkettung der primären Definition jedes konstituierenden Wortes erben.

```ts
interface Sentence {
    id: string; // Stable unique identifier
    wordIds: string[]; // Ordered word IDs that form the sentence
    definitionId?: string; // Optional explicit definition; falls back to word definitions
}
```

### Untergeordnete Komponenten

Eine untergeordnete Komponente ist eine unabhängig durchzuführende Lernfunktion für eine bestimmte Sprache. Es kündigt sich selbst über das Sprachmodul an, sodass die Benutzeroberfläche ein Unternavigationsmenü erstellen kann. Untergeordnete Komponenten sollten in erster Linie Schnittstellen zur und von der Bibliothek sein – sie verbrauchen Bibliotheksdaten und schreiben optional zurück (z. B. zeichnet ein Quiz auf, welche Zeichen ein Benutzer geübt hat).

```ts
interface LanguageChildComponent {
    id: string; // Unique within the language, e.g. 'hiragana-alphabet'
    label: string; // Display name shown in the sub-nav, e.g. 'Hiragana Alphabet'
    pageUrl: string; // URL the router navigates to, e.g. '/study/ja/hiragana'
    order?: number; // Lower numbers appear first in the sub-nav menu
}
```

Jede untergeordnete Komponente registriert ihre eigene Route während `bootstrapLanguageModule` über `ctx.registerChildRoute`. Die Route bedient eine HTML-Seite oder einen API-Endpunkt. Die Benutzeroberfläche erstellt unter der Studienseite aus der Liste der registrierten untergeordneten Komponenten für die aktive Sprache ein `<nav>`.

### Registrierungsablauf

```
startup
  └─ Study gateway: discoverLanguageModules(modulesRoot)
       └─ for each language module dir: createLanguageModule() → register in languageRegistry
  └─ Study gateway: bootstrapLanguageModules(modulesRoot, ctx)
       └─ for each module: bootstrapLanguageModule(ctx)
            ├─ ctx.registerChildRoute(path, handler) — registers child page routes
            ├─ ctx.registerStaticDir(prefix, dir)   — serves static assets
            └─ ctx.gateway.registerLanguageModule(module) — adds to runtime registry
  └─ Study gateway exposes:
       GET /api/v1/study/languages/:code/modules → lists child components for that language
```

### Verzeichnisstruktur

Sprachmodule sind eigenständige Repositorys, die über den Module Marketplace installiert werden. Jedes Repository enthält:

```
cognis-module-japanese-learning/
  package.json          ← version + main field
  index.ts              ← exports createLanguageModule + bootstrapLanguageModule
  data/
    characters/
      hiragana.json     ← Layer 1 character records (one file per character class)
      katakana.json
    alt-characters/
      kanji.json        ← Layer 2 alt-character records (optional)
    definitions/
      common.json       ← Layer 3 definition records
    words/
      common.json       ← Layer 4 word records
    sentences/
      common.json       ← Layer 5 sentence records
  library/              ← TypeScript type documentation for this language's layers
    characters.ts
    alt-characters.ts
    definitions.ts
    words.ts
    sentences.ts
  components/           ← one sub-directory per child component
    hiragana-alphabet/
      ui/
        index.html
        app.js
    library/
      ui/
        index.html
        app.js          ← calls mountStudyLibraryPage from reuse/library-page.js
  docs/
    standard.en.md      ← language-specific contributor guide
```

Das `data/`-Verzeichnis ist die kanonische Quelle für alle Sprachinhalte. Der moduleigene Bibliotheksspeicher lädt diese Dateien beim Bootstrap und stellt sie über die Bibliotheks-API bereit. **Speichern Sie Sprachdaten nur an `data/`.** Untergeordnete Komponenten-UI-Dateien müssen Daten von der Bibliotheks-API abrufen. Sie dürfen Sprachdaten niemals direkt einbetten.

Untergeordnete Komponenten können selbst Unterkomponenten für tief verschachtelte Funktionen enthalten (z. B. einen Kanji-Explorer mit separaten Unterabschnitten für die Strichreihenfolge und den Wortschatz). Der `pageUrl` für solche Unterkomponenten würde ein zusätzliches Pfadsegment enthalten, und die eigene Benutzeroberfläche der untergeordneten Komponente übernimmt die interne Unternavigation.

## Konfiguration

Sprachmodule haben keine globalen Umgebungsvariablen. Das `package.json` jedes Moduls trägt ein `version`-Feld; Eine Erhöhung ist immer dann erforderlich, wenn sich die Bibliotheksdaten, die API-Oberfläche oder die Komponentenliste des Moduls ändern.

## Erweiterungspunkte

### Hinzufügen einer neuen Sprache

1. Erstellen Sie ein eigenständiges Modul-Repository mit `manifest.json` und `package.json`.
2. Exportieren Sie `bootstrapModule(ctx)` vom Manifest-Bootstrap-Einstiegspunkt.
3. Tragen Sie eine `study:language:<code>`-Funktion bei, die den Sprachdeskriptor und untergeordnete Komponenten enthält.
4. Veröffentlichen Sie das Repository über eine konfigurierte Module Marketplace-Quelle.

### Hinzufügen einer untergeordneten Komponente zu einer vorhandenen Sprache

1. Erstellen Sie `components/<component-id>/index.ts` im Sprachmodul-Repository.
2. Exportieren Sie eine `registerComponent(ctx)`-Funktion, die `ctx.registerChildRoute()` aufruft und einen `LanguageChildComponent`-Deskriptor zurückgibt.
3. Rufen Sie `registerComponent(ctx)` von `bootstrapLanguageModule(ctx)` im `index.ts` der Muttersprache auf.
4. Fügen Sie die UI-Seite unter `components/<component-id>/ui/` hinzu.

### Hinzufügen tief verschachtelter Unterkomponenten

Wenn eine untergeordnete Komponente selbst Unterabschnitte erfordert (z. B. Strichreihenfolge und Wortschatz in einem Kanji-Explorer), verwalten Sie die interne Unternavigation innerhalb der eigenen Benutzeroberfläche der untergeordneten Komponente. Das `LanguageChildComponent.pageUrl` zeigt auf den Eintrag der obersten Ebene; Das gesamte Routing der Unterabschnitte wird clientseitig innerhalb der Seite dieser Komponente abgewickelt.

## API-Routen

| Method | Path                                    | Description                                          | Auth     |
| ------ | --------------------------------------- | ---------------------------------------------------- | -------- |
| GET    | `/api/v1/study/languages`               | List all available study languages                   | Required |
| GET    | `/api/v1/study/languages/:code/modules` | List child components registered for a language code | Required |

## Konventionen für die Benutzeroberfläche von Bibliotheken und Klassenzimmern

- Die Unternavigation „Studie“ muss einen **Bibliothek**-Eintrag für Administrator-/Eigentümerbenutzer anzeigen, auch wenn die aktuell ausgewählte Lernsprache keine untergeordnete Bibliothekskomponente nativ registriert.
- Die Bibliotheksseite leitet ihren aktiven Sprachkontext aus der aktuellen Unternavigation des Benutzers ab (über `loadStudySubNavigationModel`). Fügen Sie auf der Bibliotheksseite selbst keine separate Sprachauswahl hinzu.
- Bibliotheksdaten sind ganzheitlich und sprachbewusst: Die Sprache wird als Datensatzfeld (z. B. `language`) modelliert und nicht als feste Routenaufteilung pro Sprache.
  – Jedes Sprachmodul sollte eine untergeordnete Komponentenroute **Klassenzimmer** registrieren, damit sowohl Lehrer als auch Schüler auf sprachspezifische Klassenansichten zugreifen können.
- Die Klassenzimmerseiten müssen eine Klassenauswahl, eine Visualisierung der Sitzplatzkapazität und rollenbasiertes Verhalten (Lehrerverwaltungskontrollen vs. überwiegend lesender + verlassender Schülerfluss) enthalten.
  – Sprachmodule besitzen ihre Bibliotheks- und Klassenzimmer-UI-Implementierungen und machen sie über ihre deklarierten Routen für untergeordnete Komponenten verfügbar.
