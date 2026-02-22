import { shell } from "electron";

const ROBLOX_SERVERS_API = (placeId: string) =>
  `https://games.roblox.com/v1/games/${placeId}/servers/Public?limit=100&sortOrder=Asc`;

interface RobloxServerEntry {
  id: string;
  maxPlayers: number;
  playing: number;
  fps: number;
  ping: number;
}

interface RobloxServersResponse {
  data: RobloxServerEntry[];
  nextPageCursor?: string | null;
}

/**
 * ServerJoiner fetches public servers for a place, picks first non-full,
 * and launches roblox:// protocol. Works in dev and packaged EXE.
 */
export class ServerJoiner {
  async join(placeId: string): Promise<{ success: boolean; error?: string }> {
    const trimmed = String(placeId).trim();
    if (!trimmed) {
      return { success: false, error: "Place ID is required" };
    }

    let servers: RobloxServerEntry[];
    try {
      const res = await fetch(ROBLOX_SERVERS_API(trimmed));
      if (!res.ok) {
        return { success: false, error: `API error: ${res.status}` };
      }
      const json = (await res.json()) as RobloxServersResponse;
      servers = json.data ?? [];
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Failed to fetch servers: ${message}` };
    }

    const nonFull = servers.find((s) => s.playing < s.maxPlayers);
    if (!nonFull) {
      return { success: false, error: "No non-full server found" };
    }

    const url = `roblox://placeId=${trimmed}&launchData=&gameInstanceId=${encodeURIComponent(nonFull.id)}`;
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Failed to launch: ${message}` };
    }
  }
}
