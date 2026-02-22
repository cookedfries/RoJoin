import { globalShortcut } from "electron";

export type KeybindCallback = () => void;

/** Normalize user input to Electron accelerator (e.g. "f10" -> "F10", "ctrl+q" -> "Ctrl+Q"). */
function normalizeAccelerator(input: string): string {
  const s = input.trim();
  if (!s) return "";
  const parts = s.split("+").map((p) => p.trim());
  const result: string[] = [];
  const mods = new Set(["ctrl", "control", "alt", "shift", "meta", "cmd", "command", "cmdorctrl", "commandorcontrol"]);
  for (const p of parts) {
    const lower = p.toLowerCase();
    if (mods.has(lower)) {
      if (lower === "ctrl" || lower === "control") result.push("Ctrl");
      else if (lower === "alt") result.push("Alt");
      else if (lower === "shift") result.push("Shift");
      else if (lower === "meta" || lower === "cmd" || lower === "command") result.push("Command");
      else if (lower === "cmdorctrl" || lower === "commandorcontrol") result.push("CommandOrControl");
    } else {
      if (/^f\d{1,2}$/i.test(p)) result.push("F" + p.slice(1).toUpperCase());
      else if (p.length === 1) result.push(p.toUpperCase());
      else result.push(p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
    }
  }
  return result.join("+");
}

/**
 * KeybindManager registers a single global shortcut.
 * Frontend can change the keybind via IPC; backend updates dynamically.
 * Works when app is in background (e.g. user in game).
 */
export class KeybindManager {
  private currentKeybind: string | null = null;
  private callback: KeybindCallback | null = null;

  set(keybind: string, onTrigger: KeybindCallback): boolean {
    this.unregister();
    if (!keybind || typeof keybind !== "string") return false;
    const normalized = normalizeAccelerator(keybind);
    if (!normalized) return false;
    try {
      const ok = globalShortcut.register(normalized, () => {
        this.callback?.();
      });
      if (ok) {
        this.currentKeybind = normalized;
        this.callback = onTrigger;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  unregister(): void {
    if (this.currentKeybind) {
      try {
        globalShortcut.unregister(this.currentKeybind);
      } catch {
        // ignore
      }
      this.currentKeybind = null;
    }
    this.callback = null;
  }

  get(): string | null {
    return this.currentKeybind;
  }

  isRegistered(): boolean {
    return this.currentKeybind !== null;
  }
}
