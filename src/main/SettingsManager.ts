import * as fs from "fs";
import * as path from "path";

const CONFIGS_DIR = "configs";
const SETTINGS_FILE = "settings.json";

export interface AppSettings {
  keybind?: string;
  minimizeToTray?: boolean;
  startMinimized?: boolean;
  [key: string]: unknown;
}

const DEFAULT_SETTINGS: AppSettings = {
  keybind: "F10",
  minimizeToTray: true,
  startMinimized: false,
};

/**
 * SettingsManager reads/writes settings.json in userData/configs.
 * Works in dev and packaged EXE.
 */
export class SettingsManager {
  private settingsPath: string;
  private cache: AppSettings | null = null;

  constructor(userDataPath: string) {
    this.settingsPath = path.join(userDataPath, CONFIGS_DIR, SETTINGS_FILE);
    this.ensureDir(path.dirname(this.settingsPath));
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  get(): AppSettings {
    if (this.cache) return { ...this.cache };
    try {
      if (fs.existsSync(this.settingsPath)) {
        const raw = fs.readFileSync(this.settingsPath, "utf8");
        this.cache = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as AppSettings;
        return { ...this.cache };
      }
    } catch {
      // use defaults
    }
    this.cache = { ...DEFAULT_SETTINGS };
    return { ...this.cache };
  }

  update(partial: Partial<AppSettings>): AppSettings {
    const current = this.get();
    const next = { ...current, ...partial };
    this.cache = next;
    fs.writeFileSync(this.settingsPath, JSON.stringify(next, null, 2), "utf8");
    return { ...next };
  }
}
