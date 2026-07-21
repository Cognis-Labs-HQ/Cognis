# Stabiles Bearbeitungslayout im Seitenkomponisten

## Der Bearbeitungsmodus nutzt die Maße des Ansichtsmodus

Die Bearbeitungsüberlagerung des Seitenkomponisten misst ihre Spalten nun anhand derselben Inhaltsbereichsmaße wie der Ansichtsmodus, während die Zeilenhöhe an die Zeilengröße des Ansichtsmodus gebunden bleibt. Medienintensive Elemente wie Iframes, Bilder, Video, Audio, Canvas-Inhalte, Object-/Embed-Inhalte und ausdrücklich beizubehaltende Elemente bleiben in ihren vorhandenen Karten, während Bearbeitungssteuerungen darüber gelegt werden. Dadurch wird ein Umhängen von Iframes vermieden, das eingebettete Fenster wie aktive Meetings neu laden kann. Komponenten können weiterhin mit `data-composer-preserve="false"` aussteigen, wenn ihre API-Hülle die Wiederherstellung selbst steuern muss.

## Schutz vor Aktualisierung während Meetings

Aktive Meetings fangen Tastenkürzel zum Aktualisieren jetzt ab, bevor der Browser den Entladeablauf startet, und zeigen eine In-App-Auswahl zum Bleiben im Meeting oder zum bewussten Aktualisieren und Verlassen. Die gemeinsame Ladeüberlagerung wartet nun auf `pagehide` statt `beforeunload`, sodass ein abgebrochener Browser-Aktualisierungsdialog die Meetingseite nicht im Ladezustand zurücklässt.
