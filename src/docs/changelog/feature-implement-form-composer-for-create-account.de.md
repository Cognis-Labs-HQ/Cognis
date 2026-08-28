# Eine übersichtlichere Kontoerstellung

**Feature-Zweig:** feature-implement-form-composer-for-create-account

## Das vollständige Kontoformular einheitlich zusammenstellen

Die Seite „Konto erstellen“ zeigt jetzt das vollständige Kontoformular über den gemeinsamen Formular-Composer an. Felder, Validierungshinweise, Zeichenzähler und Aktionen sind dadurch mit anderen Cognis-Formularen konsistent.

## Einladungsdetails schneller erfassbar machen

Die Ablaufzeit einer Einladung erscheint jetzt in einer kompakten Pillenanzeige. Einführungs- und Formularkarte passen ihre Höhe außerdem unabhängig voneinander an, sodass ein langes Erstellungsformular die linke Karte nicht unnötig vergrößert.

## Kontobezogene Anfragen auf öffentlichen Seiten vermeiden

Verfügbarkeits- und Anwesenheitsmeldungen warten jetzt auf ein authentifiziertes Kontotoken. Dadurch senden öffentliche Authentifizierungsseiten keine Anfragen mehr an kontogeschützte Social-APIs.

## Hervorhebung von Pflichtfeldern beibehalten

Im Formular „Konto erstellen“ stehen Pflichtfeld-Sternchen jetzt in derselben Zeile wie ihre Beschriftungen und behalten sowohl im hellen als auch im dunklen Design die gemeinsame Gefahrenfarbe.

## Änderungen

- [74cb218](https://github.com/Cognis-Labs-HQ/Cognis/commit/74cb218dfafdfd93dcfef2ca2928ac6657ff5245)
- [9cc4ed9](https://github.com/Cognis-Labs-HQ/Cognis/commit/9cc4ed9c285c77d2901d2ea4cadb35b66af6ddc6)
- [1690cdb](https://github.com/Cognis-Labs-HQ/Cognis/commit/1690cdb58e8bcad63b60ef8beba367c3d0a03031)
