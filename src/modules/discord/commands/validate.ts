import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { defer, switchMap } from 'rxjs';
import { CommandFactory } from '../../../shared/interfaces/discord';

export const VALIDATE_FACTORY: CommandFactory = (configService, sources) => {
  return {
    data: new SlashCommandBuilder().setName('validate').setDescription('Validate all Twitch subscriptions for SSL certification issues'),
    execute: (interaction: CommandInteraction) => {
      if (configService.getConfiguration().adminUsers.includes(interaction.member?.user.id || '')) {
        defer(() => interaction.deferReply({ ephemeral: true }))
          .pipe(
            switchMap(() => {
              return defer(() => interaction.editReply({ content: 'Subscription Status\n\n' + sources.twitch.getAllSubscriptionsStatus() }));
            }),
          )
          .subscribe();
      } else {
        interaction.reply({ content: "Shut up nerd you're not the developer.", ephemeral: true });
      }
    },
  };
};
