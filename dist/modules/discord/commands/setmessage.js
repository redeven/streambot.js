"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SET_MESSAGE_FACTORY = void 0;
const discord_js_1 = require("discord.js");
const utils_1 = require("../../../shared/utils/utils");
const SET_MESSAGE_FACTORY = (configService) => {
    return {
        data: new discord_js_1.SlashCommandBuilder()
            .setName('setmessage')
            .setDescription('Set the stream announcement message.')
            .addStringOption((option) => option.setName('message').setDescription('Message to send. Placeholders: {DISPLAYNAME}').setRequired(true)),
        execute: (interaction) => {
            const message = interaction.options.get('message');
            if (interaction.guild && interaction.member && message) {
                const MEMBER = interaction.member;
                if ((0, utils_1.hasAdministratorPrivileges)(MEMBER, configService.getConfiguration())) {
                    configService.getConfiguration().guilds[interaction.guild.id].announcementMessage = `${message.value}`;
                    configService.saveChanges();
                    interaction.reply({ content: `You set the announcement message to \`${message.value}\``, ephemeral: true });
                }
                else {
                    interaction.reply({ content: `You don't have permissions to execute this command.`, ephemeral: true });
                }
            }
        },
    };
};
exports.SET_MESSAGE_FACTORY = SET_MESSAGE_FACTORY;
