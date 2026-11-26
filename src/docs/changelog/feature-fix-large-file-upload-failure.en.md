# Larger Profile Uploads

**Feature Branch:** feature-fix-large-file-upload-failure

## Profile media now follows storage quotas

Avatar and banner uploads no longer have a separate per-file size ceiling. Large pictures and animated GIF banners can be saved whenever the upload remains within the user's profile namespace and global storage quotas.

## Uploads now pass through the web proxy

The bundled nginx configuration no longer rejects large API request bodies before Cognis can apply the user's storage quotas. Banner uploads also retain their crop position while saving the layout preference.

## Commits

- [da55ed2](https://github.com/Cognis-Labs-HQ/Cognis/commit/da55ed2007f45ede24247703d8862de139091ca9)
