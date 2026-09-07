# Eine übersichtlichere Kontoerstellung

**Feature-Zweig:** feature-implement-form-composer-for-create-account

## Das vollständige Kontoformular einheitlich zusammenstellen

Die Seite „Konto erstellen“ zeigt jetzt das vollständige Kontoformular über den gemeinsamen Formular-Composer an. Felder, Validierungshinweise, Zeichenzähler und Aktionen sind dadurch mit anderen Cognis-Formularen konsistent.

## Einladungsdetails schneller erfassbar machen

Die Ablaufzeit einer Einladung erscheint jetzt in einer kompakten, nicht live angekündigten Pillenanzeige, damit sekündliche Aktualisierungen Nutzende von Bildschirmleseprogrammen nicht wiederholt unterbrechen. Einführungs- und Formularkarte passen ihre Höhe außerdem unabhängig voneinander an, sodass ein langes Erstellungsformular die linke Karte nicht unnötig vergrößert.

## Kontobezogene Anfragen auf öffentlichen Seiten vermeiden

Verfügbarkeits- und Anwesenheitsmeldungen fragen jetzt eine UI-Kontextfähigkeit des Auth-Gateways ab, anstatt dessen Token-Speicher direkt zu lesen. Dadurch senden öffentliche Authentifizierungsseiten keine Anfragen an kontogeschützte Social-APIs, ohne Social Profile an einen Authentifizierungsanbieter zu koppeln.

## Hervorhebung von Pflichtfeldern beibehalten

Das Formular „Konto erstellen“ überlässt die Darstellung der Felder jetzt vollständig dem gemeinsamen Formular-Composer, anstatt Registrierungs- oder Anmeldestile anzuwenden. Dadurch bleiben Pflichtfeld-Sternchen im hellen und dunklen Design einheitlich.

## Änderungen

- [74cb218](https://github.com/Cognis-Labs-HQ/Cognis/commit/74cb218dfafdfd93dcfef2ca2928ac6657ff5245)
- [9cc4ed9](https://github.com/Cognis-Labs-HQ/Cognis/commit/9cc4ed9c285c77d2901d2ea4cadb35b66af6ddc6)
- [1690cdb](https://github.com/Cognis-Labs-HQ/Cognis/commit/1690cdb58e8bcad63b60ef8beba367c3d0a03031)
- [a057317](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0573172b0549e663be0058f77b3af5aecc12432)
- [00fd542](https://github.com/Cognis-Labs-HQ/Cognis/commit/00fd5422)
