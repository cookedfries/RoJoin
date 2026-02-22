import * as fs from "fs";
import * as path from "path";

export interface RoJoinConfig {
  id: string;
  name: string;
  placeId: string;
  createdAt: string;
  updatedAt: string;
}

const CONFIGS_DIR = "configs";
const ACTIVE_CONFIG_FILE = "activeConfig.json";

/**
 * ConfigManager handles config CRUD and active config in userData/configs.
 * Paths are resolved from userData - works in dev and packaged EXE.
 */
export class ConfigManager {
  private configsDir: string;
  private activeConfigPath: string;
  private activeConfigId: string | null = null;

  constructor(userDataPath: string) {
    this.configsDir = path.join(userDataPath, CONFIGS_DIR);
    this.activeConfigPath = path.join(this.configsDir, ACTIVE_CONFIG_FILE);
    this.ensureDir(this.configsDir);
    this.loadActiveId();
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadActiveId(): void {
    try {
      if (fs.existsSync(this.activeConfigPath)) {
        const raw = fs.readFileSync(this.activeConfigPath, "utf8");
        const data = JSON.parse(raw) as { activeConfigId: string | null };
        this.activeConfigId = data.activeConfigId ?? null;
      }
    } catch {
      this.activeConfigId = null;
    }
  }

  private configPath(id: string): string {
    return path.join(this.configsDir, `config_${id}.json`);
  }

  create(config: Omit<RoJoinConfig, "id" | "createdAt" | "updatedAt">): RoJoinConfig {
    const id = `cfg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();
    const full: RoJoinConfig = {
      id,
      name: config.name,
      placeId: config.placeId,
      createdAt: now,
      updatedAt: now,
    };
    fs.writeFileSync(this.configPath(id), JSON.stringify(full, null, 2), "utf8");
    return full;
  }

  update(id: string, updates: Partial<Pick<RoJoinConfig, "name" | "placeId">>): RoJoinConfig | null {
    const p = this.configPath(id);
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, "utf8");
    const current = JSON.parse(raw) as RoJoinConfig;
    const updated: RoJoinConfig = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(p, JSON.stringify(updated, null, 2), "utf8");
    return updated;
  }

  delete(id: string): boolean {
    const p = this.configPath(id);
    if (!fs.existsSync(p)) return false;
    fs.unlinkSync(p);
    if (this.activeConfigId === id) {
      this.activeConfigId = null;
      this.saveActiveId();
    }
    return true;
  }

  get(id: string): RoJoinConfig | null {
    const p = this.configPath(id);
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw) as RoJoinConfig;
  }

  list(): RoJoinConfig[] {
    const files = fs.readdirSync(this.configsDir).filter((f) => f.startsWith("config_") && f.endsWith(".json"));
    const configs: RoJoinConfig[] = [];
    for (const f of files) {
      const p = path.join(this.configsDir, f);
      try {
        const raw = fs.readFileSync(p, "utf8");
        configs.push(JSON.parse(raw) as RoJoinConfig);
      } catch {
        // skip invalid
      }
    }
    return configs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  private saveActiveId(): void {
    fs.writeFileSync(
      this.activeConfigPath,
      JSON.stringify({ activeConfigId: this.activeConfigId }, null, 2),
      "utf8"
    );
  }

  setActive(id: string | null): boolean {
    if (id !== null) {
      const cfg = this.get(id);
      if (!cfg) return false;
    }
    this.activeConfigId = id;
    this.saveActiveId();
    return true;
  }

  getActive(): RoJoinConfig | null {
    if (!this.activeConfigId) return null;
    return this.get(this.activeConfigId);
  }
}
