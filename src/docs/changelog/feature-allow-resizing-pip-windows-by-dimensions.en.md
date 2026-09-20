# Make PiP minimum sizes orientation-aware

**Feature Branch:** feature-allow-resizing-pip-windows-by-dimensions

## Switch PiP minimum dimensions while resizing

PiP minimum dimensions now switch promptly according to the resize gesture's relative width and height. A hysteresis band keeps small pointer movements near the boundary from repeatedly oscillating between horizontal and vertical orientations.

## Keep page actions above PiP windows

PiP windows now remain in the document stacking context, where the page action dock's higher stacking level reliably keeps its buttons accessible.

## Commits

- [587c4fd](https://github.com/Cognis-Labs-HQ/Cognis/commit/587c4fd331054f67b804b97795620b48f64541dd)
