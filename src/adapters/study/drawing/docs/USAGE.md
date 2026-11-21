# Usage

Practical procedures for Writing Practice.

## Prerequisites

Enroll in a language with writing-practice support.

## Examples

Draw a response, use hints when needed and complete the attempt; change navigation without discarding the current pad unnecessarily.

The same `openDrawingPad` engine accepts an optional `container`, abort `signal` and `onResult` callback. Without a container it opens a movable, resizable floating window within the page; loading a different card preserves its position. With a container it embeds the entire pad, locks the original character and reports success only when every ordered stroke is accepted. Flashcards requires no optional Drawing adapter for embedded Writing.

## Expected Results

The pad preserves its working state; trusted completed attempts can record learning progress.

## Troubleshooting

Check language support and prepared offline assets. Hidden answers remain concealed until the relevant reveal action.
