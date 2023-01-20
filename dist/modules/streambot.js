"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreambotJs = void 0;
const configuration_1 = require("./configuration/configuration");
const discord_1 = require("./discord/discord");
const logging_1 = require("./logging/logging");
class StreambotJs {
    constructor(opts, sslCert) {
        var _a;
        this.configService = new configuration_1.SJSConfiguration();
        this.sslCert = sslCert;
        this.discord = new discord_1.SJSDiscord(opts.discordOpts, this.configService, this.sslCert);
        logging_1.SJSLogging.setLogLevel((_a = opts.logLevel) !== null && _a !== void 0 ? _a : logging_1.LogLevel.Basic);
    }
    init(opts) {
        return this.discord.init(opts.discordOpts);
    }
    setConfiguration(configuration) {
        this.configService.setConfiguration(configuration);
    }
    get configurationChanges() {
        return this.configService.configurationChanges;
    }
    get expressMiddleware() {
        return this.discord.expressMiddleware;
    }
}
exports.StreambotJs = StreambotJs;
