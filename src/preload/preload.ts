import { contextBridge, ipcRenderer } from "electron";

export type Config = {
  id: string;
  name: string;
  placeId: string;
  createdAt: string;
  updatedAt: string;
};

export type Settings = {
  keybind?: string;
  minimizeToTray?: boolean;
  startMinimized?: boolean;
  [key: string]: unknown;
};

const api = {
  config: {
    create: (payload: { name: string; placeId: string }) =>
      ipcRenderer.invoke("config:create", payload),
    update: (payload: { id: string; name?: string; placeId?: string }) =>
      ipcRenderer.invoke("config:update", payload),
    delete: (payload: { id: string }) =>
      ipcRenderer.invoke("config:delete", payload),
    get: (payload: { id: string }) =>
      ipcRenderer.invoke("config:get", payload),
    list: () =>
      ipcRenderer.invoke("config:list"),
    setActive: (payload: { id: string | null }) =>
      ipcRenderer.invoke("config:setActive", payload),
    getActive: () =>
      ipcRenderer.invoke("config:getActive"),
  },
  settings: {
    get: () =>
      ipcRenderer.invoke("settings:get"),
    update: (payload: Partial<Settings>) =>
      ipcRenderer.invoke("settings:update", payload),
  },
  keybind: {
    set: (payload: { keybind: string }) =>
      ipcRenderer.invoke("keybind:set", payload),
    get: () =>
      ipcRenderer.invoke("keybind:get"),
  },
  server: {
    join: (payload?: { placeId?: string }) =>
      ipcRenderer.invoke("server:join", payload ?? {}),
  },
};

contextBridge.exposeInMainWorld("rojoin", api);
