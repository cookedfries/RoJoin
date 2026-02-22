import * as fs from "fs";
import * as path from "path";

/**
 * Logger writes to logs.txt in userData and optionally to console.
 * Uses Electron userData path - works in dev and packaged EXE.
 */
export class Logger {
  private logFilePath: string;
  private enabled: boolean = true;

  constructor(userDataPath: string) {
    const logsDir = path.join(userDataPath, "configs");
    this.ensureDir(logsDir);
    this.logFilePath = path.join(logsDir, "logs.txt");
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private formatMessage(level: string, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const dataStr = data !== undefined ? " " + JSON.stringify(data) : "";
    return `${timestamp} [${level}] ${message}${dataStr}\n`;
  }

  private append(level: string, message: string, data?: unknown): void {
    if (!this.enabled) return;
    const line = this.formatMessage(level, message, data);
    try {
      fs.appendFileSync(this.logFilePath, line, "utf8");
    } catch (err) {
      console.error("Logger failed to write file:", err);
    }
    if (level === "ERROR" || level === "WARN") {
      console[level === "ERROR" ? "error" : "warn"](message, data ?? "");
    }
  }

  info(message: string, data?: unknown): void {
    this.append("INFO", message, data);
  }

  warn(message: string, data?: unknown): void {
    this.append("WARN", message, data);
  }

  error(message: string, data?: unknown): void {
    this.append("ERROR", message, data);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}
