"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REAUTHORIZE_FACTORY = void 0;
const builders_1 = require("@discordjs/builders");
const rxjs_1 = require("rxjs");
const REAUTHORIZE_FACTORY = (configService, sources) => {
    return {
        data: new builders_1.SlashCommandBuilder().setName('reauthorize').setDescription('Refresh invalid Twitch subscriptions to repair SSL verification'),
        execute: (interaction) => {
            var _a;
            if (configService.getConfiguration().adminUsers.includes(((_a = interaction.member) === null || _a === void 0 ? void 0 : _a.user.id) || '')) {
                (0, rxjs_1.defer)(() => interaction.deferReply({ ephemeral: true }))
                    .pipe((0, rxjs_1.switchMap)(() => sources.twitch.reauthorizeInvalidSubscriptions()), (0, rxjs_1.switchMap)(() => (0, rxjs_1.defer)(() => interaction.editReply({ content: 'Finished refreshing all Twitch subscriptions' }))))
                    .subscribe();
            }
            else {
                interaction.reply({ content: "Shut up nerd you're not the developer.", ephemeral: true });
            }
        },
    };
};
exports.REAUTHORIZE_FACTORY = REAUTHORIZE_FACTORY;
