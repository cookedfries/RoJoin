import { app, BrowserWindow, Menu } from "electron";
import * as fs from "fs";
import * as path from "path";
import { Logger } from "./Logger";
import { ConfigManager } from "./ConfigManager";
import { SettingsManager } from "./SettingsManager";
import { KeybindManager } from "./KeybindManager";
import { ServerJoiner } from "./ServerJoiner";
import { registerIPC } from "./IPCController";

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

export class App {
  private userDataPath: string = "";
  private logger!: Logger;
  private configManager!: ConfigManager;
  private settingsManager!: SettingsManager;
  private keybindManager!: KeybindManager;
  private serverJoiner!: ServerJoiner;
  private mainWindow: BrowserWindow | null = null;

  async init(): Promise<void> {
    this.userDataPath = app.getPath("userData");
    this.ensureStorageFolders();
    this.logger = new Logger(this.userDataPath);
    this.configManager = new ConfigManager(this.userDataPath);
    this.settingsManager = new SettingsManager(this.userDataPath);
    this.keybindManager = new KeybindManager();
    this.serverJoiner = new ServerJoiner();

    this.logger.info("App init", { userDataPath: this.userDataPath, isPackaged: app.isPackaged });

    registerIPC({
      configManager: this.configManager,
      settingsManager: this.settingsManager,
      keybindManager: this.keybindManager,
      serverJoiner: this.serverJoiner,
      logger: this.logger,
      onKeybindTrigger: () => this.onKeybindTrigger(),
    });

    const settings = this.settingsManager.get();
    const keybind = (settings.keybind as string) || "F10";
    this.keybindManager.set(keybind, () => this.onKeybindTrigger());
    this.logger.info("Keybind registered", { keybind });

    this.createWindow();
  }

  private ensureStorageFolders(): void {
    const configsDir = path.join(this.userDataPath, "configs");
    if (!fs.existsSync(configsDir)) {
      fs.mkdirSync(configsDir, { recursive: true });
    }
  }

  private onKeybindTrigger(): void {
    this.serverJoiner
      .join(
        this.configManager.getActive()?.placeId ?? ""
      )
      .then((r) => {
        if (!r.success) this.logger.warn("Keybind join failed", r.error);
      })
      .catch((err) => this.logger.error("Keybind join error", err));
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 900,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, "..", "preload", "preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
      },
      show: false,
    });

    this.mainWindow.once("ready-to-show", () => {
      this.mainWindow?.show();
      Menu.setApplicationMenu(null);
    });

    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });

    const rendererPath = isDev
      ? path.join(__dirname, "..", "..", "src", "renderer", "index.html")
      : path.join(__dirname, "..", "..", "src", "renderer", "index.html");
    this.mainWindow.loadFile(rendererPath).catch(() => {
      this.mainWindow?.loadURL("data:text/html;charset=utf-8,<h1>RoJoin</h1><p>Renderer index.html not found.</p>");
    });
  }

  quit(): void {
    this.keybindManager.unregister();
    this.mainWindow = null;
  }
}
