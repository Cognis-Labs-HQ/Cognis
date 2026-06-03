# Zurückgestellte Feedback-Punkte

## Code-Review — Lade-Schleife der kompakten Navigation

### dashboard-layout-menu.test.js Stabilität der kompakten Navigation — Laufzeittest für Observer hinzufügen

**Vorschlag des Reviewers:** Ersetze die quelltextbasierte Assertion für die Schutzlogik der kompakten Navigation durch einen Laufzeittest, der die Observer wiederholt auslöst und überprüft, dass die Navigation stabil bleibt, ohne in eine Schleife zu geraten.

**Grund für die Zurückstellung:** Das aktuelle UI-Testgerüst in diesem Repository ist für `dashboard-layout.js` auf Quelltext- und Fixture-Prüfungen ausgelegt und bietet noch keinen leichtgewichtigen DOM-/Runtime-Loader, um `applyCompactNav()` direkt zu testen, ohne eine größere Änderung an der Testinfrastruktur vorzunehmen. Ich habe die gezielten Quelltext-Regressionstests in diesem Fix beibehalten und die schwergewichtigere Runtime-Test-Harness-Arbeit auf einen Folge-Task verschoben, damit die eigentliche Korrektur der Lade-Schleife sofort ausgeliefert werden kann.

### messages/ui/app.js wrapComposerSelection JSDoc — Verhalten bei Auswahl vs. Cursor erläutern

**Vorschlag des Reviewers:** Füge eine ausführlichere JSDoc-Beschreibung hinzu, die erklärt, wie sich `wrapComposerSelection()` bei markiertem Text gegenüber einem zusammengeschobenen Cursor verhält.

**Grund für die Zurückstellung:** Dieses Feedback betrifft `src/adapters/social/messages/ui/` und liegt damit außerhalb des Regressionsbereichs der kompakten Navigation. Nach den Versionsregeln des Repositorys würde eine Änderung an diesem Adapter für eine reine Dokumentationsnacharbeit nicht zusammengehörige Adapter-Versions- und Changelog-Updates erfordern, daher blieb die Stelle in diesem Fix unverändert.

### messages/ui/app.js Vorlagen-Einfügepfad — applyTemplateToComposer-Logik entdoppeln

**Vorschlag des Reviewers:** Verwende für den Vorlagen-Einfügepfad bei ungefähr Zeile 3288-3291 den bestehenden Helfer `applyTemplateToComposer`, statt dieselbe Composer-Aktualisierungslogik zu wiederholen.

**Grund für die Zurückstellung:** Das ist ein adapterlokales Refactoring in `src/adapters/social/messages/ui/`, das die hier behobene Lade-Schleifen-Regression der kompakten Navigation nicht betrifft. Würde ich es in diesen Patch aufnehmen, würde sich der Umfang auf ein separates Cleanup des Messages-Adapters ausweiten und unnötige Versions-/Changelog-Arbeit auslösen, daher habe ich es für einen dedizierten Folge-Task zurückgestellt.
