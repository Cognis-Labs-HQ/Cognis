# Stärkerer Blockierungsschutz in Suche und Besprechungen

**Feature Branch:** feature-restrict-blocked-user-interactions

## Blockierte Nutzer finden blockierende Konten nicht mehr über die Suche

Die Profilsuche blendet jetzt jedes Konto aus, das die anfragende Person blockiert hat. Das gilt für die globale Suche, die soziale Nutzersuche und die Suche nach Besprechungsteilnehmern, auch wenn die anfragende Person außerhalb der Verwaltungsseite für Benutzer eine Admin-Rolle hat.

## Blockierte Nutzer werden von Besprechungsinteraktionen ausgeschlossen

Besprechungszugriffsprüfungen lehnen Sitzungen jetzt ab, wenn Organisator oder Teilnehmer der Besprechung die anfragende Person blockiert haben. Außerdem überspringen Besprechungsbenachrichtigungen Empfänger, die wegen einer Blockierung keine Aktivitäten des Organisators sehen sollen.

## Commits

- [17431b6](https://github.com/Cognis-Labs-HQ/Cognis/commit/17431b6df2bdf6b47df8ddfbe98d64a997bb196f)
