# PR-Changelog — Klassenräume

## Zusammenfassung

Das Classroom-Erlebnis wurde auf `/classroom` konsolidiert und die bisherigen
Seiten `/classes` und `/my-classes` dorthin umgeleitet.

Die Klassenauswahl wurde in den gemeinsamen Study-Footer verschoben, der
Classroom-Eintrag aus der Sprachmodul-Subnavigation entfernt und die
vereinheitlichte Classroom-Seite für Lehrer-/Schüleransicht, Chat/Meeting im
Raum, Klassensuche und popupbasierte Klassenerstellung erweitert.

Der Klassen-Adapter unterstützt nun Beitrittsmodi, Schutz vor doppelten
Klassen pro Sprache, Agenda-Termine, Classroom-Chat-Auflösung und garantiert
vorhandene Classroom-Datensätze; außerdem wurden Übersetzungen und
Regressionstests an den neuen Ablauf angepasst.

Das Klassenauswahl-Dropdown wurde aus dem Seiteninhalt entfernt und als
Page-Composer-Footer-Element in die globale Fußzeile integriert. Es zeigt
„Klasse: [Dropdown]" und wendet die Auswahl sofort an. Das „Lehrer:"-Präfix
wurde aus der Klassenliste und der Lehreranzeige entfernt.

Die Classroom-Ansicht wurde vollständig als 2D-Vogelperspektive neu gestaltet.
Der Raum ist mit einer Wandbegrenzung versehen. An der Vorderwand zeigt eine
dunkelgrüne Tafel die aktive Klassen-Agenda in einem kursiven Kreide-Schriftstil
mit Aktionsbuttons. Links von der Tafel befindet sich eine scrollbare
Schülerliste. Eine Holztür mit sichtbarem Schwenkbogen befindet sich an der
rechten Wand; Schüler können sie zum Verlassen der Klasse nutzen, Lehrer können
Schüler per Drag hierhin entfernen.

Der Boden füllt sich mit dynamischen Reihen aus Tisch-Stuhl-Einheiten, die mit
der Kapazität skalieren. Der Page-Composer unterstützt nun einen `footer`-Parameter
für Footer-Elemente.

## Geänderte Komponenten und Dateien

- Study-Classes-Adapter-Routen und -Stores:
    - `src/adapters/study/classes/index.ts`
    - `src/adapters/study/classes/routes/index.ts`
    - `src/adapters/study/classes/routes/route-helpers.ts`
    - `src/adapters/study/classes/routes/available-classes-route.ts`
    - `src/adapters/study/classes/routes/enrolled-classes-route.ts`
    - `src/adapters/study/classes/store/classes.ts`
    - `src/adapters/study/classes/store/memberships.ts`
    - `src/adapters/study/classes/store/schema.ts`
    - `src/adapters/study/classes/store/teacher-requests.ts`
    - `src/adapters/study/classes/store/types.ts`
    - `src/adapters/study/classes/store/rows.ts`
- Classroom-UI und gemeinsame Study-Navigation:
    - `src/adapters/study/classes/ui/classroom.js`
    - `src/adapters/study/classes/ui/classroom-render.js`
    - `src/adapters/study/classes/ui/study-footer.js`
    - `src/adapters/study/classes/ui/view-mode.js`
    - `src/adapters/study/classes/ui/classes.css`
    - `src/modules/study/languages/reuse/study-sub-navigation.js`
    - `src/modules/study/languages/reuse/classroom-page.js`
    - `src/modules/study/languages/reuse/classroom-page.css`
    - `src/modules/study/languages/reuse/alphabet-page.js`
    - `src/modules/study/languages/reuse/library-page.js`
    - `src/ui/reuse/page-composer/init.js`
- Unterstützende Integrationen, Strings und Tests:
    - `src/adapters/social/messages/index.ts`
    - `src/adapters/social/messages/store/schema.ts`
    - `src/adapters/social/messages/store/rooms.ts`
    - `src/adapters/social/messages/store/db-messages-store.ts`
    - `src/gateways/study/ui/classes-dashboard-element.js`
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`
    - `src/ui/tests/app-router.test.js`
    - `src/ui/tests/study-followups.test.js`

## Geänderte Komponenten und Dateien

- Study-Classes-Adapter-Routen und -Stores:
    - `src/adapters/study/classes/index.ts`
    - `src/adapters/study/classes/routes/index.ts`
    - `src/adapters/study/classes/routes/route-helpers.ts`
    - `src/adapters/study/classes/routes/available-classes-route.ts`
    - `src/adapters/study/classes/routes/enrolled-classes-route.ts`
    - `src/adapters/study/classes/store/classes.ts`
    - `src/adapters/study/classes/store/memberships.ts`
    - `src/adapters/study/classes/store/schema.ts`
    - `src/adapters/study/classes/store/teacher-requests.ts`
    - `src/adapters/study/classes/store/types.ts`
    - `src/adapters/study/classes/store/rows.ts`
- Classroom-UI und gemeinsame Study-Navigation:
    - `src/adapters/study/classes/ui/classroom.js`
    - `src/adapters/study/classes/ui/classroom-render.js`
    - `src/adapters/study/classes/ui/study-footer.js`
    - `src/adapters/study/classes/ui/view-mode.js`
    - `src/adapters/study/classes/ui/classes.css`
    - `src/modules/study/languages/reuse/study-sub-navigation.js`
    - `src/modules/study/languages/reuse/classroom-page.js`
    - `src/modules/study/languages/reuse/alphabet-page.js`
    - `src/modules/study/languages/reuse/library-page.js`
- Unterstützende Integrationen, Strings und Tests:
    - `src/adapters/social/messages/index.ts`
    - `src/adapters/social/messages/store/schema.ts`
    - `src/adapters/social/messages/store/rooms.ts`
    - `src/adapters/social/messages/store/db-messages-store.ts`
    - `src/gateways/study/ui/classes-dashboard-element.js`
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`
    - `src/ui/tests/app-router.test.js`
    - `src/ui/tests/study-followups.test.js`
