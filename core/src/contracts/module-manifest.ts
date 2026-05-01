export type ModuleClass = 'core' | 'extension';

export interface ModuleManifest {
  id: string;
  name: string;
  version: string;
  publisher?: string;
  class: ModuleClass;
  coreApiVersion: string;
  capabilities: string[];
  entrypoints: {
    api?: string;
    ui?: string;
    cli?: string;
    db?: string;
  };
  files?: Array<{
    path: string;
    sha256: string;
  }>;
}
