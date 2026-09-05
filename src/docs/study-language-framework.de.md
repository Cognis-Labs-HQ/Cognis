# Study-Sprachpakete

## Zweck

Ein Study-Sprachpaket ist eine externe, unveränderliche Datenveröffentlichung. Es enthält Manifest, versioniertes Library-Schema, Datensätze, optionale Assets, Lizenzen und lokalisierte Dokumentation. Sprachdatensätze, ausführbare Renderer, Routen, CSS und anbieterspezifische Speicherung gehören nie in Cognis Core.

## Paketaufbau und Manifest

Das Paket stellt `manifest.json`, die referenzierte Schemadatei und das Inhaltsverzeichnis sowie optional ein Asset-Verzeichnis bereit. Alle Pfade sind relative, durch Schrägstriche getrennte Pfade ohne leere, absolute, übergeordnete (`..`), Rückstrich- oder Symlink-Ausbrüche. Inhaltsteile werden nach Ebene und Dateiname lexikalisch gelesen.

Das Manifest deklariert `id`, `publisher`, `namespace`, semantische `version`, `contentRevision`, `schema`, `content`, optional `assets` und `license`. Die Lizenz besitzt eine maschinenlesbare ID und optional HTTPS-URL und Attribution. Manifest und Schema nennen exakt denselben Paketnamensraum; jede Datensatz-ID beginnt mit `<namespace>:`. Geänderte Bytes erfordern eine neue Paketversion.

## Neutraler Schemavertrag

Schemata besitzen eine unveränderliche positive Ganzzahlversion, BCP-47-Sprachkennung, Namensraum, lokalisierte Bezeichnungen und Beschreibungen sowie beliebige, vom Verbraucher benannte Ebenen. Cognis schreibt keine Ebenen-IDs vor. Eine Ebene kann stattdessen die semantische Rolle `atomicWritingUnit`, `compoundWritingUnit`, `lexicalUnit`, `orderedLexicalSequence`, `passage`, `definition` oder `practicePrompt` deklarieren.

Felder besitzen lokalisierte Metadaten und den Typ `string`, `number`, `integer`, `boolean`, `localizedText`, `stringList` oder `asset`. Sie können erforderlich sein und Detailhinweise für Renderer, Reihenfolge, Gruppe und Sichtbarkeit tragen. Ebenen können Titelfeld und Feldreihenfolge angeben.

Beziehungen deklarieren lokalisierte Metadaten, Zielebene, minimale und maximale Kardinalität, optionale Ordnung, erforderliches Ziel und zwingendes Löschverhalten (`restrict`, `detach` oder `cascade`). Resolverrollen (`grapheme`, `token`, `longestMatch` oder `explicit`) beschreiben Absicht ohne Algorithmen einzubetten. Geordnete Referenzen benötigen eindeutige, nichtnegative Ganzzahlpositionen.

Ebenen können Aktivitätskompatibilität und Interessensadern als namensräumige Camel-Case-Rollen veröffentlichen. Das sind Erkennungsmerkmale, keine ausführbaren Hooks. Optional kann ein SVG- oder JSON-Strich-Asset-Feld mit Koordinatensystem deklariert werden. Asset-Felder referenzieren Dateien relativ zum Asset-Verzeichnis. Bei der atomaren Aufnahme speichert Cognis die geprüften Bytes mit ihrer unveränderlichen Paketidentität und ersetzt Datensatzwerte durch authentifizierte Library-Asset-URLs.

## Deterministische Aufnahme

`inspectContentPack` prüft vor jedem Schreiben Manifest, semantische Version, Lizenz, sichere Pfade, Namensraumbesitz, Schemaverweise, Feldtypen, den vollständigen Beziehungsgraphen und Assets. Manifest, Schema, Datensätze und Asset-Bytes werden kanonisch in deterministischer Reihenfolge gehasht. Fehler verursachen keine Schreibvorgänge.

`ingestContentPack` speichert Schema, Datensätze, Beziehungen und Beleg in einer Transaktion. Schema-ID und Version sind unveränderlich. Eine identische Installation ist idempotent; abweichende Bytes unter derselben Identität werden abgelehnt. Alle Sprachfakten bleiben in externen Inhaltsdateien; Resolver und Aktivitäten integrieren sich über `ctx`-Flows.
