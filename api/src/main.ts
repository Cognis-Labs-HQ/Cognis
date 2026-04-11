import { buildServer } from './server.js';
import type { ModuleManifest, ModuleRuntimeGateway, ModuleState } from '@cognis/core';

class InMemoryModuleRuntimeGateway implements ModuleRuntimeGateway {
  private readonly manifests: ModuleManifest[] = [
    {
      id: 'cognis-core',
      name: 'Cognis Core',
      version: '0.1.0',
      class: 'core',
      coreApiVersion: 'v1',
      capabilities: ['system:health'],
      entrypoints: {}
    }
  ];

  private readonly states = new Map<string, ModuleState>([['cognis-core', { moduleId: 'cognis-core', enabled: true }]]);

  async listManifests(): Promise<ModuleManifest[]> {
    return this.manifests;
  }

  async installFromZip(_binary: Uint8Array): Promise<ModuleManifest> {
    throw new Error('ZIP module installation is not wired in bootstrap runtime yet');
  }

  async enable(moduleId: string): Promise<ModuleState> {
    const state = { moduleId, enabled: true };
    this.states.set(moduleId, state);
    return state;
  }

  async disable(moduleId: string): Promise<ModuleState> {
    const state = { moduleId, enabled: false };
    this.states.set(moduleId, state);
    return state;
  }
}

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const host = process.env.HOST ?? '0.0.0.0';

const server = buildServer({ moduleRuntimeGateway: new InMemoryModuleRuntimeGateway() });
server.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`Cognis API listening on http://${host}:${port}`);
});
