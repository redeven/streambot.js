"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SJSLogging = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["None"] = 0] = "None";
    LogLevel[LogLevel["Basic"] = 1] = "Basic";
    LogLevel[LogLevel["Error"] = 2] = "Error";
    LogLevel[LogLevel["Warning"] = 3] = "Warning";
    LogLevel[LogLevel["Debug"] = 4] = "Debug";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
class SJSLogging {
    static setLogLevel(logLevel) {
        SJSLogging.logLevel = logLevel;
    }
    static log(...content) {
        if (SJSLogging.logLevel >= LogLevel.Basic) {
            console.log(...content);
        }
    }
    static error(...content) {
        if (SJSLogging.logLevel >= LogLevel.Error) {
            console.error(...content);
        }
    }
    static warn(...content) {
        if (SJSLogging.logLevel >= LogLevel.Warning) {
            console.warn(...content);
        }
    }
    static debug(...content) {
        if (SJSLogging.logLevel >= LogLevel.Debug) {
            console.log(...content);
        }
    }
}
exports.SJSLogging = SJSLogging;
SJSLogging.logLevel = LogLevel.None;
