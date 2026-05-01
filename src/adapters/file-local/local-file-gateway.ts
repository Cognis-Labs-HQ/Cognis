import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { FileStorageGateway, StoredObject } from '@cognis/core';

export class LocalFileGateway implements FileStorageGateway {
  constructor(private readonly rootPath: string) {}

  async put(key: string, content: Uint8Array, contentType?: string): Promise<StoredObject> {
    const target = join(this.rootPath, key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
    const info = await stat(target);

    return {
      key,
      size: info.size,
      contentType,
      lastModified: info.mtime
    };
  }

  async get(key: string): Promise<Uint8Array | null> {
    const target = join(this.rootPath, key);

    try {
      return await readFile(target);
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<boolean> {
    const target = join(this.rootPath, key);
    try {
      await rm(target);
      return true;
    } catch {
      return false;
    }
  }

  async list(prefix = ''): Promise<StoredObject[]> {
    const baseDir = join(this.rootPath, prefix);
    try {
      const entries = await readdir(baseDir, { withFileTypes: true });
      const files = entries.filter((entry) => entry.isFile());

      return Promise.all(
        files.map(async (entry) => {
          const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
          const fullPath = join(this.rootPath, relative);
          const info = await stat(fullPath);
          return {
            key: relative,
            size: info.size,
            lastModified: info.mtime
          };
        })
      );
    } catch {
      return [];
    }
  }
}
