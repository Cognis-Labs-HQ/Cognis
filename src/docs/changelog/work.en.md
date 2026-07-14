# Whiteboard Share Fix

## Share links create again

Whiteboard share creation now refreshes its share-flow hooks before minting and accepts the Share gateway issue-token result, preventing false 403 responses.

## Share route coverage

A route test now verifies that whiteboard share creation returns the minted share record from the Share gateway flow.
