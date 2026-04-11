import type { ModuleRuntimeGateway } from '../gateways/module-runtime-gateway.js';
import type { ModuleManifest } from '../contracts/module-manifest.js';

export class ModuleService {
  constructor(private readonly runtime: ModuleRuntimeGateway) {}

  async enable(moduleId: string): Promise<{ moduleId: string; enabled: boolean }> {
    const manifests = await this.runtime.listManifests();
    const found = manifests.find((manifest) => manifest.id === moduleId);

    if (!found) {
      throw new Error(`Unknown module: ${moduleId}`);
    }

    this.assertToggleAllowed(found);
    return this.runtime.enable(moduleId);
  }

  async disable(moduleId: string): Promise<{ moduleId: string; enabled: boolean }> {
    const manifests = await this.runtime.listManifests();
    const found = manifests.find((manifest) => manifest.id === moduleId);

    if (!found) {
      throw new Error(`Unknown module: ${moduleId}`);
    }

    this.assertToggleAllowed(found);
    return this.runtime.disable(moduleId);
  }

  private assertToggleAllowed(manifest: ModuleManifest): void {
    if (manifest.class === 'core') {
      throw new Error(`Core module ${manifest.id} cannot be toggled at runtime`);
    }
  }
}
