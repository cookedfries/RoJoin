import { ipcMain } from "electron";
import type { ConfigManager, RoJoinConfig } from "./ConfigManager";
import type { SettingsManager, AppSettings } from "./SettingsManager";
import type { KeybindManager } from "./KeybindManager";
import type { ServerJoiner } from "./ServerJoiner";
import type { Logger } from "./Logger";

const IPC_CONFIG_CREATE = "config:create";
const IPC_CONFIG_UPDATE = "config:update";
const IPC_CONFIG_DELETE = "config:delete";
const IPC_CONFIG_GET = "config:get";
const IPC_CONFIG_LIST = "config:list";
const IPC_CONFIG_SET_ACTIVE = "config:setActive";
const IPC_CONFIG_GET_ACTIVE = "config:getActive";
const IPC_SETTINGS_GET = "settings:get";
const IPC_SETTINGS_UPDATE = "settings:update";
const IPC_KEYBIND_SET = "keybind:set";
const IPC_KEYBIND_GET = "keybind:get";
const IPC_SERVER_JOIN = "server:join";

export interface IPCControllerDeps {
  configManager: ConfigManager;
  settingsManager: SettingsManager;
  keybindManager: KeybindManager;
  serverJoiner: ServerJoiner;
  logger: Logger;
  onKeybindTrigger: () => void;
}

/**
 * IPCController registers all IPC handlers. Frontend controls; backend executes.
 */
export function registerIPC(deps: IPCControllerDeps): void {
  const { configManager, settingsManager, keybindManager, serverJoiner, logger, onKeybindTrigger } = deps;

  ipcMain.handle(IPC_CONFIG_CREATE, async (_, payload: { name: string; placeId: string }) => {
    try {
      const config = configManager.create({ name: payload.name, placeId: payload.placeId });
      logger.info("config:create", { id: config.id });
      return { success: true, data: config };
    } catch (err) {
      logger.error("config:create failed", err);
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle(IPC_CONFIG_UPDATE, async (_, payload: { id: string; name?: string; placeId?: string }) => {
    try {
      const config = configManager.update(payload.id, {
        ...(payload.name !== undefined && { name: payload.name }),
        ...(payload.placeId !== undefined && { placeId: payload.placeId }),
      });
      if (!config) return { success: false, error: "Config not found" };
      logger.info("config:update", { id: payload.id });
      return { success: true, data: config };
    } catch (err) {
      logger.error("config:update failed", err);
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle(IPC_CONFIG_DELETE, async (_, payload: { id: string }) => {
    try {
      const ok = configManager.delete(payload.id);
      if (!ok) return { success: false, error: "Config not found" };
      logger.info("config:delete", { id: payload.id });
      return { success: true };
    } catch (err) {
      logger.error("config:delete failed", err);
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle(IPC_CONFIG_GET, async (_, payload: { id: string }) => {
    const config = configManager.get(payload.id);
    if (!config) return { success: false, error: "Config not found" };
    return { success: true, data: config };
  });

  ipcMain.handle(IPC_CONFIG_LIST, async () => {
    const list = configManager.list();
    return { success: true, data: list };
  });

  ipcMain.handle(IPC_CONFIG_SET_ACTIVE, async (_, payload: { id: string | null }) => {
    const ok = configManager.setActive(payload.id);
    if (!ok && payload.id !== null) return { success: false, error: "Config not found" };
    logger.info("config:setActive", { id: payload.id });
    return { success: true };
  });

  ipcMain.handle(IPC_CONFIG_GET_ACTIVE, async () => {
    const config = configManager.getActive();
    return { success: true, data: config };
  });

  ipcMain.handle(IPC_SETTINGS_GET, async () => {
    const settings = settingsManager.get();
    return { success: true, data: settings };
  });

  ipcMain.handle(IPC_SETTINGS_UPDATE, async (_, payload: Partial<AppSettings>) => {
    const settings = settingsManager.update(payload);
    if (payload.keybind !== undefined) {
      keybindManager.set(payload.keybind, onKeybindTrigger);
    }
    logger.info("settings:update", payload);
    return { success: true, data: settings };
  });

  ipcMain.handle(IPC_KEYBIND_SET, async (_, payload: { keybind: string }) => {
    const keybind = payload.keybind ?? "";
    const ok = keybindManager.set(keybind, onKeybindTrigger);
    if (!ok) {
      return { success: false, error: "Failed to register keybind (invalid or already in use)" };
    }
    const registered = keybindManager.get();
    if (registered) settingsManager.update({ keybind: registered });
    logger.info("keybind:set", { keybind: registered });
    return { success: true, data: { keybind: registered } };
  });

  ipcMain.handle(IPC_KEYBIND_GET, async () => {
    const keybind = keybindManager.get();
    return { success: true, data: { keybind } };
  });

  ipcMain.handle(IPC_SERVER_JOIN, async (_, payload: { placeId?: string }): Promise<{ success: boolean; error?: string; data?: unknown }> => {
    let placeId = payload?.placeId;
    if (placeId == null || placeId === "") {
      const active = configManager.getActive();
      if (!active) return { success: false, error: "No place ID and no active config" };
      placeId = active.placeId;
    }
    const result = await serverJoiner.join(placeId);
    if (result.success) logger.info("server:join", { placeId });
    else logger.warn("server:join failed", { placeId, error: result.error });
    return result;
  });
}
