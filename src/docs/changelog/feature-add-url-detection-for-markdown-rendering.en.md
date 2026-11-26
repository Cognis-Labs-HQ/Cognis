# Safer Link Rendering

**Feature Branch:** feature-add-url-detection-for-markdown-rendering

## HTTP URLs become links

Markdown-rendered user and admin content now turns plain HTTP and HTTPS URLs into safe hyperlinks automatically.

## Non-HTTP links stay text

Only HTTP and HTTPS destinations render as links, preventing mail and app-specific URL schemes from becoming clickable in generated content.

## Commits

- [b69825f](https://github.com/Cognis-Labs-HQ/Cognis/commit/b69825ff2436e850fe55db64531d012ddda87b20)
