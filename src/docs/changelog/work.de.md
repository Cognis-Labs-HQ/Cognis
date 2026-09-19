# Gültige Abhängigkeits-UUIDs

**Feature-Zweig:** work

## Komponentenabhängigkeiten werden korrekt aufgelöst

Registration deklariert jetzt ausschließlich Gateway-Abhängigkeiten, wodurch die Startwarnung entfällt. Der Social-Messages-Adapter verweist nun auf die UUID des installierten Social-Profile-Adapters.

## Abhängigkeitsprüfung verhindert Regressionen

Architekturprüfungen weisen nun Abhängigkeits-UUIDs zurück, die keine installierte Komponente identifizieren, sowie Adapter-UUIDs in Gateway-Abhängigkeitslisten.

## Änderungen

- [6fa7e14](https://github.com/Cognis-Labs-HQ/Cognis/commit/6fa7e1466a06e62c23cf4905d680fa3aa1bf7768)
