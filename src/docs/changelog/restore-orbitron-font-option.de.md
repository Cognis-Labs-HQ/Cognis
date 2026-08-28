# Orbitron-Schrift Behoben

**Feature Branch:** copilot/restore-orbitron-font-option

## Orbitron-Schrift Wird Jetzt Korrekt Angezeigt

Die Orbitron-Schriftart erschien zwar in der Schriftauswahl, wurde jedoch nicht gerendert, da die Schriftart nie in den Browser geladen wurde. Ein Google-Fonts-Import wurde dem Basis-Stylesheet hinzugefügt, sodass Orbitron (und die anderen Anwendungsschriften Audiowide, Rajdhani, Exo 2 und Inter) jetzt ordnungsgemäß geladen werden und in den Einstellungen zur Auswahl stehen. Die Content Security Policy wurde ebenfalls aktualisiert, um das Laden von Stylesheets von Google Fonts und Schriftdateien vom Google-Font-CDN zu erlauben.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/f5e3113eb90b58fc10f5ea1d5355b10358d6051e
