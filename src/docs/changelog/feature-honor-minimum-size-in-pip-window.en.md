# Honor provider-defined PiP minimum sizes

**Feature Branch:** feature-honor-minimum-size-in-pip-window

## Enforce PiP metadata dimensions

Focus Control now validates minimum width and height metadata declared by providers and passes those dimensions to the floating-window controller, so resized PiP windows retain the provider's usable minimum size.

## Update PiP minimum sizes while open

PiP consumers can now update a floating window's minimum dimensions through its cleanup handle. If the open window is smaller than a new valid minimum, Cognis immediately enlarges and repositions it within the available boundary.

## Commits

- [f38004f](https://github.com/Cognis-Labs-HQ/Cognis/commit/f38004f3247f8a9c00277cf0f727615d55d1ccc5)
- [1d32579](https://github.com/Cognis-Labs-HQ/Cognis/commit/1d3257996e889a1a23fd7ebd316a0c280b7ebee3)
- [094c44d](https://github.com/Cognis-Labs-HQ/Cognis/commit/094c44dbc1be75bd716e3522942f694315a90722)
