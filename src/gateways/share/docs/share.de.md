# Share Gateway

## Überblick

Das Share-Gateway verwaltet öffentliche Freigabetokens für Cognis-Ressourcen. Es erstellt, listet, widerruft und löst Freigabelinks über kanonische `ctx`-Flows auf, damit ressourcenbesitzende Gateways und Module teilnehmen können, ohne Share-Interna zu importieren.

## Share-Seite

Geteilte Ressourcen werden unter `/share/:token` geöffnet. Die Seite verwendet den Standard-Page-Composer mit einer reduzierten Shell, einer Cognis-Kopfzeile und einem Renderer, der von der besitzenden Komponente ausgewählt wird.
