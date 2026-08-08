# Larger Profile Uploads

## Profile media now follows storage quotas

Avatar and banner uploads no longer have a separate per-file size ceiling. Large pictures and animated GIF banners can be saved whenever the upload remains within the user's profile namespace and global storage quotas.

## Uploads now pass through the web proxy

The bundled nginx configuration no longer rejects large API request bodies before Cognis can apply the user's storage quotas. Banner uploads also retain their crop position while saving the layout preference.
