"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STREAMER_LIST_FACTORY = void 0;
const discord_js_1 = require("discord.js");
const utils_1 = require("../../../shared/utils/utils");
const STREAMER_LIST_FACTORY = (configService, sources) => {
    return {
        data: new discord_js_1.SlashCommandBuilder().setName('streamerlist').setDescription('Show list of streamers'),
        execute: (interaction) => {
            var _a;
            if ((_a = interaction.guild) === null || _a === void 0 ? void 0 : _a.id) {
                const SOURCES = Object.entries(configService.getConfiguration().guilds[interaction.guild.id].sources)
                    .filter(([name, source]) => Object.keys(sources).includes(name))
                    .map(([name, source]) => `${(0, utils_1.capitalize)(name)}: ${Object.values(source)
                    .map((streamer) => (0, utils_1.sanitize)(streamer.displayName))
                    .join(', ')}`);
                interaction.reply({ content: `Channels:\n${SOURCES.join('\n')}`, ephemeral: true });
            }
        },
    };
};
exports.STREAMER_LIST_FACTORY = STREAMER_LIST_FACTORY;
