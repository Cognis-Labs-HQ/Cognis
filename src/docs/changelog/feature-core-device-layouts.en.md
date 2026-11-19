# Device Layouts

**Feature Branch:** feature-core-device-layouts

## Responsive Workspaces

Calendar adds agendas for constrained panes, and Messages fits conversations to the visible viewport while preserving drafts.

## Composer

Centralize width and input presentation, responsive reading order, content refresh and reader dialogs in [Page Composer](/docs/page-composer).

Account and shared Calendar pages now reuse the same validated date/view interactions, including in the viewport fixture.

## Page and Sidebar Navigation

A Pages launcher switches destinations on compact screens; sidebars share one double-chevron control and keyboard dismissal.

## Readable Mobile Content

Profile prioritizes identity and posts on phones and tablets. Study card readers keep content and navigation usable on short screens. Header and footer edges align.

## Component Isolation

Keep viewport fixtures with their components and use explicit asset roots and external-contract fakes. Feature references describe behavior; tutorial references describe guide targets and link to those details.

## Compact Sidebars

Reduce empty drawer space and retain one scroll surface for long conversation lists. Decks use menu entries rather than button surfaces.

Fix form-style leakage into sidebar menus and retain themed action and field controls. Verify light and dark sidebar rendering across phone, tablet and desktop sizes.

## Adaptive Study Navigation

Compress language labels under width pressure while retaining accessible names. Preserve upstream sub-navigation styling.

## Composer Panel Appearance

Unify sidebar and main-panel transparency through Composer, protect shared menu appearance from page styles, and remove the extra Calendar, Messages and Modules styling.

Restore the shared content inset on viewport-filling pages and remove opaque list wrappers around Calendar menu entries. Protect both through Composer.

Calendar and Messages fit the viewport while preserving a minimum reading area after controls and padding. Composer aligns sidebar headings and protects padded calendar menu entries and their selection indicator.

Growing Study Explore layers reuse Composer viewport fitting and its reading-area minimum. Provider-authored fixed charts retain their layout, and newly created entries refresh through Composer.

## Commits

- [f4f6d3a84](https://github.com/Cognis-Labs-HQ/Cognis/commit/f4f6d3a84b587d4eb169b5db76b850956544ad31)
- [1ab4a71b2babcede98fe870eac78989dca014b38](https://github.com/Cognis-Labs-HQ/Cognis/commit/1ab4a71b2babcede98fe870eac78989dca014b38)
- [883db306dce10da3bf67b4fac29ca6c89f2ae5b9](https://github.com/Cognis-Labs-HQ/Cognis/commit/883db306dce10da3bf67b4fac29ca6c89f2ae5b9)
- [a0e4d976a436221c63c31eb622a55524de1b6bf0](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0e4d976a436221c63c31eb622a55524de1b6bf0)
- [7127b6fa0650fb93631a2650e8014ceb8daffa6c](https://github.com/Cognis-Labs-HQ/Cognis/commit/7127b6fa0650fb93631a2650e8014ceb8daffa6c)
- [2920069afb9d94aa4a1d4f36cbfa479c33460bdc](https://github.com/Cognis-Labs-HQ/Cognis/commit/2920069afb9d94aa4a1d4f36cbfa479c33460bdc)
- [b5e4e290a216185f9dbc6fddebd34f3779bfca24](https://github.com/Cognis-Labs-HQ/Cognis/commit/b5e4e290a216185f9dbc6fddebd34f3779bfca24)
- [ca32c7cc5577eefa3e0068638013bbb7ec6d3d5e](https://github.com/Cognis-Labs-HQ/Cognis/commit/ca32c7cc5577eefa3e0068638013bbb7ec6d3d5e)
- [bbcf6b7249ac7f3a2d7ce6d1890c5401e6f4e4ca](https://github.com/Cognis-Labs-HQ/Cognis/commit/bbcf6b7249ac7f3a2d7ce6d1890c5401e6f4e4ca)
- [122aff36a39ece336a7690014f0e1430a52ec0b4](https://github.com/Cognis-Labs-HQ/Cognis/commit/122aff36a39ece336a7690014f0e1430a52ec0b4)
- [5d47fdb3b621bcf1a686f675b925af446a988c9e](https://github.com/Cognis-Labs-HQ/Cognis/commit/5d47fdb3b621bcf1a686f675b925af446a988c9e)
- [ed1b78f54d5dd5dfdcffa29c7f6d4864fb7529d9](https://github.com/Cognis-Labs-HQ/Cognis/commit/ed1b78f54d5dd5dfdcffa29c7f6d4864fb7529d9)
- [b43f5f30405bd3392cd89b1f29873ab8f9c56756](https://github.com/Cognis-Labs-HQ/Cognis/commit/b43f5f30405bd3392cd89b1f29873ab8f9c56756)
- [12bf7ba55d5912fa34132a8077af5d70964f6c04](https://github.com/Cognis-Labs-HQ/Cognis/commit/12bf7ba55d5912fa34132a8077af5d70964f6c04)
- [5a0be4f7eeb6ee529b81485b0f3db2efbd629356](https://github.com/Cognis-Labs-HQ/Cognis/commit/5a0be4f7eeb6ee529b81485b0f3db2efbd629356)
