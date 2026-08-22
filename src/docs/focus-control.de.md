# Fokussteuerung

## Manifestschema

Seiten und einzelne Composer-Elemente deklarieren `focusControl` mit stabilen Kennungen, lokalisierten Textschlüsseln, einer registrierten Route, Darstellungsarten und serialisierbarem Zustand. Nachrichten dürfen weder HTML noch Rückrufe enthalten.

## Abläufe und Anbieter

Benannte Abläufe trennen Deklaration, Autorisierung, Start, Laden, Veröffentlichung, Anwendung, Übergabe und Beendigung. Anbieter registrieren Fähigkeiten ausschließlich über ctx.

## Sicherheit und Synchronisierung

Jeder Vorgang wird authentifiziert, auf eine Kollaborationsressource begrenzt und erneut auf Mitgliedschaft und Rolle geprüft. Zustände sind auf 64 KiB begrenzt; monotone Revisionen verhindern Konflikte und ermöglichen Wiederverbindungen.

## Externes Modul

Ein Whiteboard-Modul verweist auf seine entdeckte Modulroute. Nur Ressourcenkennung und Darstellungsmetadaten werden fokussynchronisiert; Dokumentänderungen verbleiben beim Whiteboard-Anbieter.
