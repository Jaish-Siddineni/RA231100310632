import * as fs from "fs";
import * as path from "path";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  meta?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const COLORS: Record<LogLevel, string> = {
  DEBUG: "\x1b[36m", // cyan
  INFO: "\x1b[32m",  // green
  WARN: "\x1b[33m",  // yellow
  ERROR: "\x1b[31m", // red
};
const RESET = "\x1b[0m";

class Logger {
  private service: string;
  private minLevel: LogLevel;
  private logToFile: boolean;
  private logFilePath: string;

  constructor(
    service: string,
    minLevel: LogLevel = "DEBUG",
    logToFile: boolean = true
  ) {
    this.service = service;
    this.minLevel = minLevel;
    this.logToFile = logToFile;
    this.logFilePath = path.join(__dirname, "logs", `${service}.log`);

    if (this.logToFile) {
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatEntry(entry: LogEntry): string {
    const meta = entry.meta ? ` | meta=${JSON.stringify(entry.meta)}` : "";
    return `[${entry.timestamp}] [${entry.level}] [${entry.service}] ${entry.message}${meta}`;
  }

  private write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message,
      meta,
    };

    const formatted = this.formatEntry(entry);
    const colored = `${COLORS[level]}${formatted}${RESET}`;

    // stdout
    if (level === "ERROR") {
      process.stderr.write(colored + "\n");
    } else {
      process.stdout.write(colored + "\n");
    }

    // file
    if (this.logToFile) {
      fs.appendFileSync(this.logFilePath, formatted + "\n", "utf8");
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.write("DEBUG", message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.write("INFO", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.write("WARN", message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.write("ERROR", message, meta);
  }

  // Express/HTTP middleware factory
  httpMiddleware() {
    const logger = this;
    return function (
      req: { method: string; url: string; headers: Record<string, string> },
      res: { statusCode: number; on: (event: string, cb: () => void) => void },
      next: () => void
    ) {
      const start = Date.now();
      logger.info("Incoming request", {
        method: req.method,
        url: req.url,
        userAgent: req.headers["user-agent"] ?? "unknown",
      });

      res.on("finish", () => {
        const duration = Date.now() - start;
        const level: LogLevel = res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARN" : "INFO";
        logger.write(level, "Request completed", {
          method: req.method,
          url: req.url,
          status: res.statusCode,
          durationMs: duration,
        });
      });

      next();
    };
  }
}

export function createLogger(
  service: string,
  minLevel: LogLevel = "DEBUG",
  logToFile: boolean = true
): Logger {
  return new Logger(service, minLevel, logToFile);
}

export default Logger;
