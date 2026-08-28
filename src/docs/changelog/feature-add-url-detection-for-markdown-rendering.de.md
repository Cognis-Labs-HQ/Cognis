# Sicherere Links

**Feature-Zweig:** feature-add-url-detection-for-markdown-rendering

## HTTP-URLs werden Links

Markdown-gerenderte Inhalte von Benutzern und Administratoren wandeln einfache HTTP- und HTTPS-URLs jetzt automatisch in sichere Hyperlinks um.

## Nicht-HTTP-Links bleiben Text

Nur HTTP- und HTTPS-Ziele werden als Links gerendert, damit Mail- und app-spezifische URL-Schemata in generierten Inhalten nicht anklickbar werden.

## Änderungen

- [b69825f](https://github.com/Cognis-Labs-HQ/Cognis/commit/b69825ff2436e850fe55db64531d012ddda87b20)
