"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REAUTHORIZE_FACTORY = void 0;
const discord_js_1 = require("discord.js");
const rxjs_1 = require("rxjs");
const REAUTHORIZE_FACTORY = (configService, sources) => {
    return {
        data: new discord_js_1.SlashCommandBuilder().setName('reauthorize').setDescription('Refresh invalid Twitch subscriptions to repair SSL verification'),
        execute: (interaction) => {
            var _a;
            if (configService.getConfiguration().adminUsers.includes(((_a = interaction.member) === null || _a === void 0 ? void 0 : _a.user.id) || '')) {
                if (sources.twitch) {
                    const SOURCE = sources.twitch;
                    (0, rxjs_1.defer)(() => interaction.deferReply({ ephemeral: true }))
                        .pipe((0, rxjs_1.switchMap)(() => SOURCE.reauthorizeInvalidSubscriptions()), (0, rxjs_1.switchMap)(() => (0, rxjs_1.defer)(() => interaction.editReply({ content: 'Finished refreshing all Twitch subscriptions' }))))
                        .subscribe();
                }
                else
                    interaction.reply({ content: 'Twitch source disabled.', ephemeral: true });
            }
            else {
                interaction.reply({ content: `You don't have permissions to execute this command.`, ephemeral: true });
            }
        },
    };
};
exports.REAUTHORIZE_FACTORY = REAUTHORIZE_FACTORY;
