# Make PiP minimum sizes orientation-aware

**Feature Branch:** feature-allow-resizing-pip-windows-by-dimensions

## Switch PiP minimum dimensions while resizing

Dragging a PiP window narrower than its minimum width while making it taller than its minimum height now switches the minimum dimensions from the default horizontal orientation to a vertical orientation. Reversing that gesture switches the dimensions back.

## Keep page actions above PiP windows

Page action buttons now use a higher stacking level than floating PiP windows so the actions remain accessible.

## Commits

- [587c4fd](https://github.com/Cognis-Labs-HQ/Cognis/commit/587c4fd331054f67b804b97795620b48f64541dd)
