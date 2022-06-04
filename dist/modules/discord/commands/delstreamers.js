"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEL_STREAMERS_FACTORY = void 0;
const builders_1 = require("@discordjs/builders");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const sources_model_1 = require("../../../shared/interfaces/sources.model");
const utils_1 = require("../../../shared/utils/utils");
const DEL_STREAMERS_FACTORY = (configService, sources) => {
    return {
        data: new builders_1.SlashCommandBuilder()
            .setName('delstreamers')
            .setDescription('Subscribe to streamers to display stream announcements from.')
            .addStringOption((option) => option
            .setName('source')
            .setDescription(`Source.`)
            .setRequired(true)
            .addChoices(...sources_model_1.SOURCE_CHOICES.map((choice) => ({ value: choice, name: choice }))))
            .addStringOption((option) => option.setName('channels').setDescription('List of channels to subscribe (space-separated)').setRequired(true)),
        execute: (interaction) => {
            var _a;
            const _source = interaction.options.get('source');
            const _channels = interaction.options.get('channels');
            if (interaction.guild && interaction.member && _source && _channels) {
                const GUILD = interaction.guild;
                const MEMBER = interaction.member;
                if ((0, utils_1.hasAdministratorPrivileges)(MEMBER, configService.getConfiguration())) {
                    const CHANNELS = ((_a = _channels.value) === null || _a === void 0 ? void 0 : _a.toString().split(' ')) || [];
                    switch (_source.value) {
                        case 'twitch':
                            (0, rxjs_1.defer)(() => interaction.deferReply({ ephemeral: true }))
                                .pipe((0, operators_1.switchMap)(() => sources.twitch.removeStreamers(GUILD.id, CHANNELS)), (0, operators_1.switchMap)((streamers) => (0, rxjs_1.defer)(() => interaction.editReply({ content: `Removed ${streamers.length} Twitch channel${streamers.length === 1 ? '' : 's'}` }))))
                                .subscribe();
                            break;
                        case 'trovo':
                            const removedStreamers = sources.trovo.removeStreamers(GUILD.id, CHANNELS);
                            interaction.reply({ content: `Removed ${removedStreamers} Trovo channel${removedStreamers === 1 ? '' : 's'}`, ephemeral: true });
                            break;
                        default:
                            interaction.reply({ content: `Incorrect source type.`, ephemeral: true });
                    }
                }
                else {
                    interaction.reply({ content: `You don't have permissions to execute this command.`, ephemeral: true });
                }
            }
        },
    };
};
exports.DEL_STREAMERS_FACTORY = DEL_STREAMERS_FACTORY;