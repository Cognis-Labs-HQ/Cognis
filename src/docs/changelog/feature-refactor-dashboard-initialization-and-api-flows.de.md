# Schneller Dashboard-Start

**Feature Branch:** feature-refactor-dashboard-initialization-and-api-flows

## Dashboard-Karten werden unabhängig geladen

Das Dashboard schließt die Einbindung direkt nach dem Rendern des Grundlayouts ab, während Kontodetails, bevorstehende Termine und Erweiterungen unabhängig weitergeladen werden, sodass eine optionale Integration die Navigation nicht blockieren kann.

## Bevorstehende Termine benötigen nur eine begrenzte Anfrage

Ein Calendar-Gateway-Flow stellt zugängliche Kalendertermine und Einladungen über einen authentifizierten Endpunkt mit dem vom Aufrufer angeforderten Ergebnislimit bereit.

## Kalenderanfragen bleiben im Kalender-Gateway

Das Dashboard verwendet die exportierte Funktion des Kalender-Gateways für bevorstehende Ereignisse, sodass Endpunkt- und Antwortdetails in der zuständigen Komponente bleiben.

## Die Versionsanzeige der Authentifizierung ist einheitlich

Die Laufzeitregistrierung der Authentifizierung meldet nun dieselbe Version wie ihr Komponentenmanifest.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/9c6605ec002e029f3e9e655a352bd6acc109ce1b
