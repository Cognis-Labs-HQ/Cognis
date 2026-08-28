# Pausierbare Toast-Zeitlimits

**Feature Branch:** feature-add-hover-behavior-to-toast-decay

## Toasts warten beim Darüberfahren

Das Darüberfahren über einen temporären Toast pausiert nun dessen Ablauf und blendet die Zeitleiste aus. Sobald der Mauszeiger den Toast verlässt, wird die Zeitleiste wieder eingeblendet und das vollständig konfigurierte Zeitlimit startet erneut.

Temporäre Toasts können außerdem ausgeblendet werden, indem sie mit der Maus oder auf einem Touchscreen nach rechts gezogen und losgelassen werden. Vor dem Loslassen kann ein Toast zurückgezogen werden, um die Geste abzubrechen und sein normales Verhalten fortzusetzen. Permanente Toasts bleiben bestehen, bis ihre Schaltfläche zum Schließen verwendet wird.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/9f860c0f2d5ebf90f5af70bc0a44daa414958713
