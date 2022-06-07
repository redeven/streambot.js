"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findBetweenStrings = exports.hasAdministratorPrivileges = exports.capitalize = exports.sanitize = exports.getNow = void 0;
const discord_js_1 = require("discord.js");
const moment_1 = __importDefault(require("moment"));
function getNow() {
    return (0, moment_1.default)().format('YYYY-MM-DD HH:mm:ss.SSS');
}
exports.getNow = getNow;
function sanitize(text) {
    const unescaped = text.replace(/\\(\*|_|`|~|\\)/g, '$1');
    const escaped = unescaped.replace(/(\*|_|`|~|\\)/g, '\\$1');
    return escaped;
}
exports.sanitize = sanitize;
function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
exports.capitalize = capitalize;
function hasAdministratorPrivileges(member, configuration) {
    return member.permissions.has(discord_js_1.Permissions.FLAGS.ADMINISTRATOR) || configuration.adminUsers.includes(member.id);
}
exports.hasAdministratorPrivileges = hasAdministratorPrivileges;
function findBetweenStrings(source, startString, endString) {
    const startIndex = source.indexOf(startString);
    if (startIndex !== -1) {
        const subString = source.substring(startIndex);
        const endIndex = subString.indexOf(endString);
        if (endIndex !== -1) {
            const result = subString.substring(startString.length, endIndex);
            return result;
        }
    }
    return undefined;
}
exports.findBetweenStrings = findBetweenStrings;
