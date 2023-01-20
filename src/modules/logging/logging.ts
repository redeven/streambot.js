export enum LogLevel {
  None,
  Basic,
  Error,
  Warning,
  Debug,
}

export class SJSLogging {
  private static logLevel: LogLevel = LogLevel.None;

  public static setLogLevel(logLevel: LogLevel): void {
    SJSLogging.logLevel = logLevel;
  }

  public static log(...content: any[]): void {
    if (SJSLogging.logLevel >= LogLevel.Basic) {
      console.log(...content);
    }
  }

  public static error(...content: any[]): void {
    if (SJSLogging.logLevel >= LogLevel.Error) {
      console.error(...content);
    }
  }

  public static warn(...content: any[]): void {
    if (SJSLogging.logLevel >= LogLevel.Warning) {
      console.warn(...content);
    }
  }

  public static debug(...content: any[]): void {
    if (SJSLogging.logLevel >= LogLevel.Debug) {
      console.log(...content);
    }
  }
}
