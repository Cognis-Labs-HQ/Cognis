# Reliable Dependency Installs

**Feature Branch:** N/A

## Workspace ceilings aligned

Internal dependency ceilings now include the component versions in this repository, so npm links local workspaces instead of requesting private Cognis packages from the public registry.

## Drift detection added

Architecture checks now report internal dependency ranges that exclude their corresponding local workspace versions.

## Commits
