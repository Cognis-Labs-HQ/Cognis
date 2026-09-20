# Fehlerseite: Heller Modus

**Feature-Zweig:** copilot/add-light-mode-support

## Fehlerseite passt sich korrekt an den Light Mode an

Die Fehlerseite wird nun in Dark Mode und Light Mode korrekt dargestellt. Der
animierte Farbverlauf-Titel nutzte bereits eine hellere Farbpalette im Light
Mode; diese Änderung sorgt dafür, dass die umgebenden Shell-Elemente ebenfalls
angepasst werden.

Shell-Container (das Workspace-Panel und die schwebende Fußzeile) verwendeten
bisher einen fest kodierten dunklen Marine-Farbton für ihren Glaseffekt. Im
Light Mode wechseln sie nun zu einem halbtransparenten weißen Hintergrund, der
den trüben grauen Schleier auf dem hellen Seitengradienten beseitigt.

Hover-Zustände in Navigation und Dropdown erhalten im Light Mode eine sichtbare
schiefergetönte Hervorhebung. Zuvor war der Hover-Hintergrund ein kaum
sichtbares, fahles Weiß, das interaktive Elemente flach wirken ließ.

Die Browser-Chrome-Designfarbe (Adressleiste auf Mobilgeräten) wird nun
dynamisch aktualisiert, wenn der Benutzer das Thema wechselt – zwischen dem
dunklen Marineblau und dem hellen blau-weißen Seitenfarbe.

## Änderungen

- [ca2c1bc](https://github.com/Cognis-Labs-HQ/Cognis/commit/ca2c1bc892e1236a186d35264745f40c369a8ed0)
