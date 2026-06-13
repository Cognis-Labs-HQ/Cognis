# Inline Material Viewer & Chat

## Class materials render inside the agenda tile

Selected class materials now open and display directly within the agenda tile. Text and Markdown files are rendered with full Markdown formatting. Images are displayed with pan and zoom controls that the teacher can operate; students see the teacher's exact view in real time.

## File Reader gateway and adapters

A new File Reader gateway provides a pluggable file-rendering architecture. The text adapter (formerly the study Notepad adapter) handles Markdown and plain text. A new image adapter handles image formats with a pointer-event pan/zoom viewer that broadcasts the teacher's viewport to students via the classroom layout API.

## App-wide file type registry via CTX

`src/ui/reuse/file-reader.js` exposes `registerFileType`, `canRender`, `renderFileContent`, and `showUnsupportedToast`. Adapters call `registerFileType` at bootstrap to declare their supported file types. Attempting to open an unsupported type shows a toast notification.

## Students can always open the chat tile

The student interaction lock no longer blocks access to the chat tile. Students can switch to the class chat at any time, regardless of whether the teacher is present or has locked the workspace to a specific view.

## Class chat respects message style preference

The native classroom chat panel now applies the user's configured message style (for example speech bubbles or IRC style) consistently with the Messages page.
