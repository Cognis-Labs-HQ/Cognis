# Error Page Light Mode

## Error page adapts cleanly to light mode

The error page now renders correctly in both dark and light mode. The animated
gradient heading already used a lighter colour palette in light mode; this
change ensures that the surrounding shell elements match.

Shell containers (the workspace panel and floating footer) previously used a
hardcoded dark navy tint for their glass effect. They now switch to a
semi-transparent white background in light mode, eliminating the muddy grey
overlay that appeared on the light page gradient.

Navigation and dropdown hover states gain a visible slate-tinted highlight in
light mode. Previously the hover background was a near-invisible faint white,
making interactive elements appear flat.

The browser chrome theme colour (address bar on mobile) now updates dynamically
when the user toggles the theme, switching between the dark navy and the light
blue-white page colour.
