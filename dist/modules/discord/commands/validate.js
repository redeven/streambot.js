"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALIDATE_FACTORY = void 0;
const builders_1 = require("@discordjs/builders");
const rxjs_1 = require("rxjs");
const VALIDATE_FACTORY = (configService, sources) => {
    return {
        data: new builders_1.SlashCommandBuilder().setName('validate').setDescription('Validate all Twitch subscriptions for SSL certification issues'),
        execute: (interaction) => {
            var _a;
            if (configService.getConfiguration().adminUsers.includes(((_a = interaction.member) === null || _a === void 0 ? void 0 : _a.user.id) || '')) {
                (0, rxjs_1.defer)(() => interaction.deferReply({ ephemeral: true }))
                    .pipe((0, rxjs_1.switchMap)(() => {
                    return (0, rxjs_1.defer)(() => interaction.editReply({ content: 'Subscription Status\n\n' + sources.twitch.getAllSubscriptionsStatus() }));
                }))
                    .subscribe();
            }
            else {
                interaction.reply({ content: "Shut up nerd you're not the developer.", ephemeral: true });
            }
        },
    };
};
exports.VALIDATE_FACTORY = VALIDATE_FACTORY;
