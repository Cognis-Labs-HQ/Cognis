# Study-Sprachpakete

## Zweck

Ein Study-Sprachpaket ist eine externe, unveränderliche Datenveröffentlichung. Es enthält ein Manifest, ein versioniertes Library-Schema, Datensätze, optionale Assets, Lizenzen und lokalisierte Dokumentation. Pakete enthalten weder Sprachdatensätze in Cognis Core noch ausführbare Renderer, Routen, CSS oder anbieterspezifische Speicherung.

## Paketaufbau und Manifest

Ein Paket stellt `manifest.json`, die referenzierte Schemadatei und das Inhaltsverzeichnis sowie optional ein Asset-Verzeichnis bereit. Alle Pfade sind relative, durch Schrägstriche getrennte Pfade ohne leere oder absolute Bestandteile, übergeordnete Verweise (`..`), Rückstriche oder Symlink-Ausbrüche. Inhaltsteile werden nach Ebene und Dateiname lexikalisch gelesen.

Das Manifest deklariert `id`, `publisher`, `namespace`, semantische `version`, `contentRevision`, `schema`, `content`, optional `assets` und `license`. Die Lizenz besitzt eine maschinenlesbare ID und kann eine HTTPS-URL und Attribution enthalten. Das Paket besitzt genau den Namensraum, den Manifest und Schema nennen; jede Datensatz-ID beginnt mit `<namespace>:`. Geänderte Bytes müssen unter einer neuen Paketversion veröffentlicht werden.

## Neutraler Schemavertrag

Schemata besitzen eine unveränderliche positive Ganzzahlversion, BCP-47-Sprachkennung, Namensraum, lokalisierte Bezeichnungen und Beschreibungen sowie beliebige, vom Verbraucher benannte Ebenen. Cognis weist Ebenen-IDs keine Bedeutung zu. Eine Ebene kann stattdessen die semantische Rolle `atomicWritingUnit`, `compoundWritingUnit`, `lexicalUnit`, `orderedLexicalSequence`, `passage`, `definition` oder `practicePrompt` deklarieren.

Felder besitzen lokalisierte Metadaten und den Typ `string`, `number`, `integer`, `boolean`, `localizedText`, `stringList` oder `asset`. Sie können erforderlich sein und Detailhinweise für Renderer, Reihenfolge, Gruppe und Sichtbarkeit tragen. Ebenenhinweise können ein Titelfeld und die Feldreihenfolge bestimmen.

Beziehungen besitzen lokalisierte Metadaten, eine Zielebene, minimale und maximale Kardinalität, optionale Ordnung, eine Bedingung für erforderliche Ziele und zwingendes Löschverhalten (`restrict`, `detach` oder `cascade`). Resolverrollen (`grapheme`, `token`, `longestMatch` oder `explicit`) beschreiben die Absicht, ohne Algorithmen einzubetten. Geordnete Referenzen benötigen eindeutige, nichtnegative Ganzzahlpositionen.

Ebenen können Aktivitätskompatibilität und Interessensadern als namensräumige Camel-Case-Rollen veröffentlichen. Dies sind Erkennungsmerkmale, keine ausführbaren Hooks. Eine Ebene kann außerdem ein optionales SVG- oder JSON-Strich-Asset-Feld und ein Koordinatensystem deklarieren. Asset-Felder referenzieren Dateien relativ zum Asset-Verzeichnis des Manifests. Bei der atomaren Aufnahme speichert Cognis die geprüften Bytes mit ihrer unveränderlichen Paketidentität und ersetzt Datensatzwerte durch authentifizierte Library-Asset-URLs.

## Datensätze und Referenzen

Jedes unmittelbare Unterverzeichnis des Inhalts entspricht genau einer deklarierten Ebene. JSON-Dateiteile enthalten ein Array oder `{ "records": [...] }`. Datensätze enthalten eine namensräumige stabile `id`, eine Anzeige-`label`, typisierte `fields` und Referenzen. Jedes Ziel muss im selben Paket und in derselben Schemaversion vorhanden sein, auf die deklarierte Ebene zeigen sowie Kardinalität, Ordnung und erforderliche Ziele erfüllen. Alle Sprachfakten verbleiben in diesen externen Datensatzdateien.

## Deterministische Aufnahme

`inspectContentPack` führt eine schreibfreie Vorprüfung aus: Manifest, semantische Version, Lizenz, sichere Pfade, Namensraumbesitz, Schemaverweise, typisierte Felder, vollständiger Beziehungsgraph und alle Asset-Verweise werden geprüft. Kanonische Manifest-, Schema- und Datensatzdaten sowie referenzierte Asset-Bytes werden in deterministischer Reihenfolge gehasht. Ein Fehler verursacht keine Schreibvorgänge.

`ingestContentPack` speichert das geprüfte Schema, Datensätze, Beziehungen und den Beleg in einer Datenbanktransaktion. Schema-IDs und Versionen sind unveränderlich. Die erneute Installation eines identischen Herausgeber-/Paket-/Versions-Digests ist idempotent; abweichende Bytes unter derselben Identität werden abgelehnt. Oberflächen verwenden semantische Rollen und Darstellungshinweise, während Resolver- und Aktivitätsadapter über `ctx`-Flows teilnehmen.

## Prüfliste für Autoren

- Alle Datensätze und Assets außerhalb von Cognis Core halten.
- Stabile Namensräume, Datensatz-IDs, semantische Paketversionen und unveränderliche Schemaversionen verwenden.
- Metadaten für Schema, Ebene, Feld, Beziehung und Dokumentation lokalisieren.
- Lizenz, Attribution, Löschverhalten von Beziehungen und genaue Bedingungen deklarieren.
- Vor der Veröffentlichung die Prüfung ausführen und nie von der Aufzählungsreihenfolge der Inhaltsteile abhängen.
