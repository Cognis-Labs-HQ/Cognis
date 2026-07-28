# Version Lockfile Sync

## Internal packages install locally

All internal Cognis dependency ceilings now include the versions present in this repository, preventing npm from attempting to download private workspace packages from the public registry.

## Version updates stay atomic

Contributor guidance now requires versions, manifests, dependency specifications, the lockfile, and every translated version index to be updated and verified together.
