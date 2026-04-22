type LogLevel = "info" | "warn" | "error" | "debug";

interface LogContext {
  [key: string]: unknown;
}

const IS_DEV = process.env.NODE_ENV !== "production";

const LEVEL_COLOR: Record<LogLevel, string> = {
  info: "\x1b[36m", // cyan
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
  debug: "\x1b[35m", // magenta
};
const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

function formatDev(level: LogLevel, message: string, context?: LogContext): string {
  const color = LEVEL_COLOR[level];
  const tag = `${color}${BOLD}[${level.toUpperCase()}]${RESET}`;
  const time = `${DIM}${new Date().toISOString().slice(11, 23)}${RESET}`;
  let out = `${time} ${tag} ${message}`;
  if (context && Object.keys(context).length > 0) {
    for (const [key, value] of Object.entries(context)) {
      out += `\n  ${DIM}${key}${RESET} ${formatValue(value)}`;
    }
  }
  return out;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === "string") {
    if (value.length <= 200) return value;
    return `${value.slice(0, 200)}… (${value.length} chars)`;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    const json = JSON.stringify(value, null, 2);
    if (json.length <= 800) return json;
    return `${json.slice(0, 800)}… (${json.length} chars total)`;
  } catch {
    return String(value);
  }
}

function emit(level: LogLevel, message: string, context?: LogContext) {
  if (IS_DEV) {
    const line = formatDev(level, message, context);
    if (level === "error") process.stderr.write(line + "\n");
    else process.stdout.write(line + "\n");
    return;
  }
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context ?? {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}

export const logger = {
  info: (message: string, context?: LogContext) => emit("info", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", message, context),
  error: (message: string, context?: LogContext) => emit("error", message, context),
  debug: (message: string, context?: LogContext) => {
    if (IS_DEV) emit("debug", message, context);
  },
};
