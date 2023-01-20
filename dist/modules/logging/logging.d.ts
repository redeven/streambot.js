export declare enum LogLevel {
    None = 0,
    Basic = 1,
    Error = 2,
    Warning = 3,
    Debug = 4
}
export declare class SJSLogging {
    private static logLevel;
    static setLogLevel(logLevel: LogLevel): void;
    static log(...content: any[]): void;
    static error(...content: any[]): void;
    static warn(...content: any[]): void;
    static debug(...content: any[]): void;
}
