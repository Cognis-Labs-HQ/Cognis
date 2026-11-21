# Usage

Practical procedures for Calls.

## Prerequisites

Calls and Messages must be enabled; browser media permissions are needed for audio or video.

## Examples

Call a room participant, accept from the other account, allow the requested microphone access and hang up when finished.

The Call adapter is activated automatically when Messages and a `voip:startCall` browser provider are available.

## Expected Results

Signaling coordinates the call; actual media depends on the selected provider and browser support.

## Troubleshooting

Check room membership, media permissions and provider availability. Signaling alone does not supply a media transport.
