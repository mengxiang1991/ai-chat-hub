import { PlatformAdapter, PlatformConstructor } from './base';

class PlatformRegistry {
  private platforms: Map<string, PlatformConstructor> = new Map();

  register(id: string, adapter: PlatformConstructor): void {
    this.platforms.set(id, adapter);
  }

  get(id: string): PlatformAdapter | null {
    const Constructor = this.platforms.get(id);
    if (!Constructor) return null;
    return new Constructor();
  }

  list(): PlatformAdapter[] {
    return Array.from(this.platforms.values()).map(Constructor => new Constructor());
  }

  getAllIds(): string[] {
    return Array.from(this.platforms.keys());
  }
}

export const registry = new PlatformRegistry();