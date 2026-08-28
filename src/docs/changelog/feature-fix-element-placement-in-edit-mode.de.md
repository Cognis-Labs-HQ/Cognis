# Stabiles Bearbeitungslayout im Seitenkomponisten

**Feature Branch:** feature-fix-element-placement-in-edit-mode

## Der Bearbeitungsmodus nutzt die Maße des Ansichtsmodus

Die Bearbeitungsüberlagerung des Seitenkomponisten misst ihre Spalten nun anhand derselben Inhaltsbereichsmaße wie der Ansichtsmodus, während die Zeilenhöhe an die Zeilengröße des Ansichtsmodus gebunden bleibt. Medienintensive Elemente wie Iframes, Bilder, Video, Audio, Canvas-Inhalte, Object-/Embed-Inhalte und ausdrücklich beizubehaltende Elemente bleiben in ihren vorhandenen Karten, während Bearbeitungssteuerungen darüber gelegt werden. Dadurch wird ein Umhängen von Iframes vermieden, das eingebettete Fenster wie aktive Meetings neu laden kann. Komponenten können weiterhin mit `data-composer-preserve="false"` aussteigen, wenn ihre API-Hülle die Wiederherstellung selbst steuern muss.

## Schutz vor Aktualisierung während Meetings

Aktive Meetings verwenden weiterhin die Browser-Bestätigung beim tatsächlichen Aktualisieren oder Navigieren, aber Cognis ändert den gemeinsamen Ladezustand nicht mehr während `beforeunload`. Die Ladeüberlagerung wartet nun auf `pagehide`, sodass ein abgebrochener Browser-Aktualisierungsdialog die aktuelle Meetingseite und die eingebettete Sitzung sichtbar und bedienbar lässt.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/fa6742a49a2e6f0284b44c84dec7ca4d7b503ac0
