"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SET_CHANNEL_FACTORY = void 0;
const discord_js_1 = require("discord.js");
const utils_1 = require("../../../shared/utils/utils");
const SET_CHANNEL_FACTORY = (configService) => {
    return {
        data: new discord_js_1.SlashCommandBuilder()
            .setName('setchannel')
            .setDescription('Set the stream announcement channel.')
            .addStringOption((option) => option.setName('channelid').setDescription('Channel id. If empty, uses current channel id.')),
        execute: (interaction) => {
            var _a, _b;
            const channelid = interaction.options.get('channelid');
            if (interaction.guild && interaction.member) {
                const MEMBER = interaction.member;
                if ((0, utils_1.hasAdministratorPrivileges)(MEMBER, configService.getConfiguration())) {
                    const CHANNEL_ID = ((_a = channelid === null || channelid === void 0 ? void 0 : channelid.value) === null || _a === void 0 ? void 0 : _a.toString()) || ((_b = interaction.channel) === null || _b === void 0 ? void 0 : _b.id);
                    configService.getConfiguration().guilds[interaction.guild.id].channelId = CHANNEL_ID;
                    configService.saveChanges();
                    interaction.reply({ content: `You set the announcement channel to <#${CHANNEL_ID}>`, ephemeral: true });
                }
                else {
                    interaction.reply({ content: `You don't have permissions to execute this command.`, ephemeral: true });
                }
            }
        },
    };
};
exports.SET_CHANNEL_FACTORY = SET_CHANNEL_FACTORY;
