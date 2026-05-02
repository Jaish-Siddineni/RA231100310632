type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LEVEL_RANK: Record<LogLevel, number> = {
  DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3,
};

const STYLES: Record<LogLevel, string> = {
  DEBUG: "color:#00bcd4;font-weight:bold",
  INFO:  "color:#4caf50;font-weight:bold",
  WARN:  "color:#ff9800;font-weight:bold",
  ERROR: "color:#f44336;font-weight:bold",
};

class FrontendLogger {
  private service: string;
  private minLevel: LogLevel;

  constructor(service: string, minLevel: LogLevel = "DEBUG") {
    this.service = service;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_RANK[level] >= LEVEL_RANK[this.minLevel];
  }

  private write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;
    const ts = new Date().toISOString();
    const label = `%c[${ts}] [${level}] [${this.service}]`;
    if (meta) {
      console.groupCollapsed(`${label} ${message}`, STYLES[level]);
      console.log(meta);
      console.groupEnd();
    } else {
      console.log(`${label} ${message}`, STYLES[level]);
    }
  }

  debug(msg: string, meta?: Record<string, unknown>) { this.write("DEBUG", msg, meta); }
  info(msg: string, meta?: Record<string, unknown>)  { this.write("INFO",  msg, meta); }
  warn(msg: string, meta?: Record<string, unknown>)  { this.write("WARN",  msg, meta); }
  error(msg: string, meta?: Record<string, unknown>) { this.write("ERROR", msg, meta); }
}

export function createLogger(service: string, minLevel: LogLevel = "DEBUG"): FrontendLogger {
  return new FrontendLogger(service, minLevel);
}