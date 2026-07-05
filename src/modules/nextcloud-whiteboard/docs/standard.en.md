# Whiteboards

## Overview

The Nextcloud Whiteboard module lets Cognis users launch collaborative whiteboard sessions backed by a configured Nextcloud Whiteboard instance.

## Administration

Administrators configure the Nextcloud base URL and API key in the module administration section. The API key is stored server-side and is never returned by the configuration API.

## Access Control

Cognis stores an allow-list for every spawned whiteboard. Users can only list and launch whiteboards when they are the owner or an invited participant.
