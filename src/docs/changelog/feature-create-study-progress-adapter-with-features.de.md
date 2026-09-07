# Lernfortschrittsereignisse

**Feature-Zweig:** feature-create-study-progress-adapter-with-features

## Unveränderliche Fortschrittsmessung

Fügt datenschutzbezogene, idempotente Lernereignisse, ausgleichende Korrekturen, wiederherstellbare Lernstandsprojektionen, mehrdimensionale Aggregation und einen gestuften Erweiterungsablauf hinzu.

## Metadatenfiltergruppen funktionieren

Bibliotheks-Metadatengruppen können nun exklusive Einzelauswahlpillen festlegen oder Mehrfachauswahl erlauben. Eine Auswahl blendet nicht passende Karten sofort aus, auch wenn deren Rasterdarstellung zuvor den Zustand `hidden` übersteuerte.

## Authentifiziertes Audio mit Thema

Bibliotheksaudio wird nun über den authentifizierten Study-Gateway-Client statt über eine nicht authentifizierte native Medienanfrage geladen. Temporäre Medien-URLs werden danach bereinigt, und native Steuerelemente folgen dem hellen oder dunklen Anwendungsthema.

## Konforme Bibliotheks-UI-Struktur

Der Einstiegspunkt des Bibliotheksbrowsers wurde in die vorgeschriebene Adapterstruktur `ui/app/index.js` verschoben. Laufzeitroute und Strukturtests wurden aktualisiert. Dokumentationsprüfungen ignorieren nun erzeugte Build-Ausgaben, Benennungsprüfungen erfassen die verschobene Quelle sauber, und Routertests berücksichtigen dynamische Gateway-Routen sowie erhaltene Navigationszustände.

## Wiederholbare Inhaltsimporte

Inhalts-IDs der Lernbibliothek bleiben jetzt über Paketversionen hinweg stabil, und jeder Eintrag speichert einen kanonischen Inhaltshash. Der Import führt ältere versionsabhängige IDs und wiederholte identische Hashes zu einem kanonischen Eintrag zusammen und erhält eingehende sowie ausgehende Verweise. Dadurch entstehen keine wiederholten Alphabet- oder Wortschatzkarten.

## Klare Audiofehler

Fehlgeschlagenes Bibliotheksaudio ersetzt jetzt nur seinen Player durch eine lokalisierte Meldung auf derselben thematischen Fläche, anstatt einen Fehler der gesamten Bibliothek zu melden. Steuerelemente im dunklen Modus verwenden die Akzent- und hervorgehobenen Flächenfarben der Anwendung.

## Gerichtete Zeichenvarianten

Beziehungen von Zeichen und alternativen Zeichen können eine Variantenrichtung nach links, rechts, oben oder unten deklarieren. Die Bibliothek hält jede Variante unabhängig und klappt untergeordnete Steuerelemente beim Überfahren oder Tastaturfokus um die übergeordnete Karte aus.

## Vom Eigentümer gesteuerte Löschung

Inhaltseigentümer, Administratoren und Eigentümer können jetzt mehrere Bibliothekseinträge auswählen und sie mit ihren Beziehungen dauerhaft löschen. Bei der Modulaktivierung werden fehlende bereitgestellte Inhalte standardmäßig wiederhergestellt; ein ausdrückliches Kontrollkästchen bei der Löschung sperrt stattdessen die ausgewählten Inhalts-Hashes und verhindert ihre Rückkehr.

## Nutzbare Varianten und Auswahl

Gerichtete Varianten verwenden jetzt die vollständige Darstellung einer Bibliothekskarte mit leichter Transparenz und schwebendem Schatten. Ihr Hover-Bereich bleibt mit dem übergeordneten Eintrag verbunden, sodass Benutzer zu ihnen wechseln und sie öffnen können. Mehrfachauswahlkästchen bleiben bis zum Halten einer berechtigten Karte verborgen, unterstützen den dunklen Modus, und die Bibliotheksroute lädt wieder die vollständige Gestaltung der Study-Unternavigation.

## Platzierung der Aussprache

Karten und Detailtitel von Schreibeinheiten zeigen die Zeichenaussprache nun neben dem Zeichen; Aussprachen von Wörtern und Sätzen bleiben unter dem Text. Bedeutungstragende Einzelzeichenwörter können modulseitig durch eine lexikalische Beziehung zu genau einem Zeichen deklariert werden, und Zeichendetails zeigen die entsprechenden eingehenden Wörter.

## Gezielte Links und Aktionen

Die Auswahl per langem Drücken öffnet jetzt die vorhandene schwebende Aktionsleiste mit Alle auswählen, Löschen und Schließen; normale Kartenklicks beenden den Auswahlmodus. Häkchen sind zentriert, dunkle Audio-Steuerelemente unterdrücken den nativen Orangeton, und Beziehungsklicks aktivieren und markieren die Zielkategorie. Definitionstext trägt seinen Link jetzt direkt, während Bestandteilsfelder auf deklarierte Resolver-Beziehungen beschränkt sind, um doppelte und unpassende Katakana-Links zu entfernen.

## Stabile Filterung mit Varianten

Metadatenfilter verarbeiten jetzt nur Basiskarten der Bibliothek mit serialisierten Filterdaten. Schwebende gerichtete Varianten erreichen den Filterparser nicht mehr mit einem undefinierten Datensatzwert, wodurch der Laufzeitfehler auf der Bibliotheksseite behoben ist.

## Neutrale Aussprache und Audio

Zeichenaussprachen neben Detailtiteln verwenden jetzt maskierten sekundären Titeltext in kleinerer Schrift und normaler Stärke. Dunkle Audioflächen lehnen erzwungene Farbersetzungen ausdrücklich ab und wenden neutrale Gestaltung auf native Medienbedienfelder und Steuerelemente des Browsers an.

## Designgesteuertes Audio und zuverlässige Varianten

Die Bibliothek rendert nun eigene barrierefreie Audiosteuerelemente, statt die nativen Mediensteuerelemente des Browsers zu verwenden. Dadurch gelangen keine Akzentfarben des Betriebssystems oder erzwungener Designs in den Player. Zeichenkarten werden beim Zeigen und bei Tastaturfokus über benachbarte Rasterkarten angehoben, damit ihre gerichteten untergeordneten Varianten sichtbar und interaktiv bleiben.

## Moduldefinierte Diagrammraster

Bibliotheksebenen können jetzt eine Zeilengröße anfordern und Inhalte anhand der Datensatz-ID positionieren, einschließlich ausdrücklicher Leerzellen für herkömmliche Diagramme. Karten werden gleichmäßig auf die angeforderte Zeile skaliert; schwebende untergeordnete Karten werden nun mit 95 % Deckkraft dargestellt.

## Erforderliche Metadatenfilter

Module können Metadatenfiltergruppen als erforderlich markieren und ein Standard-Tag bestimmen. Erforderliche Gruppen behalten stets eine Auswahl; Gruppen mit nur einem dargestellten Tag wählen dieses automatisch aus.

## Eindeutige Zeichenkompositionen

Details zu Alternativzeichen und Wörtern gruppieren auflösungsbasierte Zeichenverknüpfungen jetzt unter den vom Modul definierten Beziehungsbezeichnungen und setzen Kompositionsoperatoren zwischen geordnete Zeichen. Definitionen und Aussprachen bleiben von diesen Schreibkompositionen visuell getrennt.

## Bewusstes Öffnen von Varianten

Karten mit untergeordneten Elementen zeigen beim Darüberfahren einen Hinweis zum Rechtsklick und öffnen Varianten erst nach einem Rechtsklick. Variantenkarten behalten ihre konstante Transparenz, schließen beim Verlassen des Fokus aus der gesamten Kartengruppe und erscheinen zusätzlich in einem eigenen Abschnitt der übergeordneten Detailansicht.

## Sichtbare Richtung der Kindkarten

Geöffnete untergeordnete Karten haben jetzt einen grünen Rahmen und einen grünen Pfeil, der ihre Richtung vom übergeordneten Element zeigt. Der Abstand zwischen Eltern- und Kindkarte verwendet denselben Wert wie das normale Kartenraster.

## Commits

- [1d65413](https://github.com/Cognis-Labs-HQ/Cognis/commit/1d65413154f89efbd91422bbfdc94bc8196e9f16)
- [656b59f](https://github.com/Cognis-Labs-HQ/Cognis/commit/656b59feef1ff344ce911a042eecae788a228cc4)
- [e183481](https://github.com/Cognis-Labs-HQ/Cognis/commit/e18348130104134eaa7962aa3020a03a22325e86)
- [ba25e44](https://github.com/Cognis-Labs-HQ/Cognis/commit/ba25e4481d6c71a35ebe2ecc8d0143b85f0125b3)
- [ef782975](https://github.com/Cognis-Labs-HQ/Cognis/commit/ef782975)
- [68bd7478](https://github.com/Cognis-Labs-HQ/Cognis/commit/68bd7478dbf6343109087bd83a9fba643452a838)
- [eeabc5e1](https://github.com/Cognis-Labs-HQ/Cognis/commit/eeabc5e1231e3de246a14ee4ff49582a7169768c)
- [2cc37134](https://github.com/Cognis-Labs-HQ/Cognis/commit/2cc371343c54afed45e545d523a751cad101be3c)
- [ad01aa56](https://github.com/Cognis-Labs-HQ/Cognis/commit/ad01aa561321b7db5982b0fbfe7f1b28ed11347b)
- [9fe9af00](https://github.com/Cognis-Labs-HQ/Cognis/commit/9fe9af0021f9a093ba432fca9761368e8df0e5f6)
- [51c727ea](https://github.com/Cognis-Labs-HQ/Cognis/commit/51c727eaeb923bd3d4a569ed9e924945f56e286c)
- [17756b2f](https://github.com/Cognis-Labs-HQ/Cognis/commit/17756b2fb83d82f25bf7c349f63170fc738db995)
- [86d3162c](https://github.com/Cognis-Labs-HQ/Cognis/commit/86d3162c19544032fa2ccc6d55f80de58f9495fb)
- [77611b4e](https://github.com/Cognis-Labs-HQ/Cognis/commit/77611b4ed1c6d7afa1221f966cf80ec9b1292316)
- [4ff6b5ec](https://github.com/Cognis-Labs-HQ/Cognis/commit/4ff6b5ec7825a19626c371347c04c43785971216)
- [1190320b](https://github.com/Cognis-Labs-HQ/Cognis/commit/1190320be506d0c74feefa441a4188d05d3892ae)
- [5bb5607e](https://github.com/Cognis-Labs-HQ/Cognis/commit/5bb5607ec3cd60ff7ff2d1329dd66cb4cfc907a8)
- [83297da5](https://github.com/Cognis-Labs-HQ/Cognis/commit/83297da5d62dcbaa8166af88531432b8468d721e)
- [164297bd](https://github.com/Cognis-Labs-HQ/Cognis/commit/164297bda76fa834f5a0e988260c7b2580ef4b87)
- [31da2e2f](https://github.com/Cognis-Labs-HQ/Cognis/commit/31da2e2fcd3284f1c2edd0da12a22c416c374b88)
- [13754134](https://github.com/Cognis-Labs-HQ/Cognis/commit/13754134d1595372336cea85a1d1f85bb4da2a9c)
- [f4ad7320](https://github.com/Cognis-Labs-HQ/Cognis/commit/f4ad732066d653312f37bba8a08c61d7d37d3522)
- [753a02dc](https://github.com/Cognis-Labs-HQ/Cognis/commit/753a02dc9171670c41d02b9665e076422f3fc3b6)
- [82bb97c0](https://github.com/Cognis-Labs-HQ/Cognis/commit/82bb97c02aac759f995373a1e9c1234d69b61d57)
- [44617c98](https://github.com/Cognis-Labs-HQ/Cognis/commit/44617c980ed07d896925f99bd27dd0ca57d2d831)
- [95b3065d](https://github.com/Cognis-Labs-HQ/Cognis/commit/95b3065d2b20baf702b1b7ffb669cdd5351caf70)
- [f1ad82df](https://github.com/Cognis-Labs-HQ/Cognis/commit/f1ad82df827fe30850bf4516aa790304a985d925)
