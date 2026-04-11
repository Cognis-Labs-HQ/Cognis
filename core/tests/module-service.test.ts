import test from 'node:test';
import assert from 'node:assert/strict';
import { ModuleService, type ModuleRuntimeGateway } from '../src/index.js';

test('module service enables extension modules', async () => {
  const runtime: ModuleRuntimeGateway = {
    async listManifests() {
      return [
        { id: 'notes', name: 'Notes', version: '1.0.0', class: 'extension', coreApiVersion: 'v1', capabilities: [], entrypoints: {} }
      ];
    },
    async installFromZip() { throw new Error('not used'); },
    async enable(moduleId: string) { return { moduleId, enabled: true }; },
    async disable(moduleId: string) { return { moduleId, enabled: false }; }
  };

  const service = new ModuleService(runtime);
  const result = await service.enable('notes');
  assert.equal(result.enabled, true);
});

test('module service blocks toggling core modules', async () => {
  const runtime: ModuleRuntimeGateway = {
    async listManifests() {
      return [
        { id: 'auth-core', name: 'Auth Core', version: '1.0.0', class: 'core', coreApiVersion: 'v1', capabilities: [], entrypoints: {} }
      ];
    },
    async installFromZip() { throw new Error('not used'); },
    async enable(moduleId: string) { return { moduleId, enabled: true }; },
    async disable(moduleId: string) { return { moduleId, enabled: false }; }
  };

  const service = new ModuleService(runtime);
  await assert.rejects(() => service.enable('auth-core'));
});
