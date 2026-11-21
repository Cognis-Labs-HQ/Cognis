# Usage

Practical procedures for Study.

## Prerequisites

Sign in and enroll in an installed language.

## Examples

Choose your enrolled language, open a learning tool and search a word using an available dictionary provider.

Deletion confirmation is planned by the server using stored schema versions and includes dependant cards absent from the current page. The Study gateway client exposes the read-only deletion preflight.

`POST /api/v1/study/library/entries/deletion-plan`

Open `/study/ja/flashcards` to browse Japanese decks; selecting English opens `/study/en/flashcards`.

## Expected Results

Navigation shows available tools and language content; names compress on narrow screens without changing the selected language.

## Troubleshooting

Check language enrollment, installed providers and offline preparation. A missing optional adapter can remove its tool without removing Study.
