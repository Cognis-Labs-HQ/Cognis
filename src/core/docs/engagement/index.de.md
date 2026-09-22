# Engagement-Wertung

## Ablauf für Anbieter

Sprach- und Aktivitätsanbieter erweitern Engagement ausschließlich über öffentliche `ctx`-Capabilities. Beim Bootstrap dient `engagement:scoring` zur Registrierung von Standardgewichten für Aktivitätstypen, geplanten bereichsgebundenen Modifikatoren und einlösbaren Boostern. Über `engagement:achievements` werden normale, seltene oder legendäre Abzeichen definiert. Eine abgeschlossene Sammlung wird an `engagement:recordActivity` übergeben; einzelne Elemente beim selbstbestimmten Lernen vergeben keine XP.

Eine Aktivität liefert eindeutige Evidenzereignis-IDs, Anbieter- und Teilnehmer-ID, Inhaltsschwierigkeit, Abschlusszeit, optionales Anbietergewicht und Bereiche wie `language` und `activity`. Ein explizites Anbietergewicht ersetzt den Standard des Aktivitätstyps. Schwierigkeit, Gewichte, Modifikatoren, Hinweise, Genauigkeit, selbstständige Antworten, Erstabschluss, Wiederholung und Zeitziele des Anbieters fließen in die Wertung ein. Wiederholungen verwenden eine einmalige feste Reduzierung statt fortlaufender Abwertung.

## Orchestrierung

`engagement:recordActivity` führt `engagement:scoreActivity` mit den Stufen `validate`, `score`, `achievements` und `publish` aus. Die Achievement-Stufe bindet `engagement:evaluateAchievements` mit `collect`, `evaluate` und `award` ein. Anbieter können diese Flows ohne Import von Core-Interna erweitern.

## Sicherheit und Evidenz

Gewichte und Multiplikatoren liegen zwischen `0.01` und `10`, Schwierigkeiten zwischen `0.1` und `10`. Ereignis-IDs müssen eindeutig, Dauer und Hinweisanzahl nicht negativ und Zeitziele geordnet sein. Verbrauchbare Booster gelten nur für einen Teilnehmer und werden nach der ersten passenden Wertung entfernt. Achievement-Auszeichnungen fixieren Beschriftung, Schwierigkeit, Symbol, Zeitpunkt und Evidenz-IDs, damit spätere Definitionsänderungen verdiente Abzeichen nicht umschreiben.
