# Share Gateway

## Overview

The Share gateway owns public share tokens for Cognis resources. It mints, lists, revokes, and resolves share links through canonical `ctx` flows so resource-owning gateways and modules can participate without importing share internals.

## Share Page

Shared resources open on `/share/:token`. The page uses the standard page composer with a minimal shell, a Cognis-branded header, and a renderer chosen by the resource-owning component.
