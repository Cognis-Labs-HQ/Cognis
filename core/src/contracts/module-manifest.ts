export type ModuleClass = 'core' | 'extension';

export interface ModuleManifest {
  id: string;
  name: string;
  version: string;
  class: ModuleClass;
  coreApiVersion: string;
  capabilities: string[];
  entrypoints: {
    api?: string;
    ui?: string;
  };
}
