"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreambotJs = void 0;
const configuration_1 = require("./configuration/configuration");
const discord_1 = require("./discord/discord");
class StreambotJs {
    constructor(opts, sslCert) {
        this.configService = new configuration_1.SJSConfiguration();
        this.discord = new discord_1.SJSDiscord(opts.discordOpts, sslCert, this.configService);
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
