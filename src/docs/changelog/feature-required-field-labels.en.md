# Inline Required Markers

**Feature Branch:** feature-required-field-labels

## Keep field markers with headings

Shared field headings keep the required asterisk in their text container, including Password Protection inside Sharing. Long labels can wrap without making the marker a separate grid item.

## Keep required state consistent

Dynamic required updates use the same heading for every supported field type. Unselected required radio groups validate without a missing-input error. Label/control associations, rich labels and separate tooltip buttons are preserved.

Changing the selected radio option clears invalid styling across the whole group without changing its value or focus.

## Commits

- [Keep required markers with shared field headings](https://github.com/Cognis-Labs-HQ/Cognis/commit/e19109e9018847a6c7f3e62848c07a3f98c489cc)
- [Synchronize required radio group validity](https://github.com/Cognis-Labs-HQ/Cognis/commit/d062b6191d45a1de33273bc8e09590a2c6b51b28)
