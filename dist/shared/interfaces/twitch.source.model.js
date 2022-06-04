"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevel = exports.TWITCH_NAME_REGEX = void 0;
exports.TWITCH_NAME_REGEX = /^[a-zA-Z0-9\-\_]{4,25}$/g;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["CRITICAL"] = 0] = "CRITICAL";
    LogLevel[LogLevel["ERROR"] = 1] = "ERROR";
    LogLevel[LogLevel["WARNING"] = 2] = "WARNING";
    LogLevel[LogLevel["INFO"] = 3] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 4] = "DEBUG";
    LogLevel[LogLevel["TRACE"] = 7] = "TRACE";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
