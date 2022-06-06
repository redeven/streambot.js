import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { defer, switchMap } from 'rxjs';
import { CommandFactory } from '../../../shared/interfaces/discord.model';

export const VALIDATE_FACTORY: CommandFactory = (configService, sources) => {
  return {
    data: new SlashCommandBuilder().setName('validate').setDescription('Validate all Twitch subscriptions for SSL certification issues'),
    execute: (interaction: CommandInteraction) => {
      if (configService.getConfiguration().adminUsers.includes(interaction.member?.user.id || '')) {
        if (sources.twitch) {
          const SOURCE = sources.twitch;
          defer(() => interaction.deferReply({ ephemeral: true }))
            .pipe(
              switchMap(() => {
                return defer(() => interaction.editReply({ content: 'Subscription Status\n\n' + SOURCE.getAllSubscriptionsStatus() }));
              }),
            )
            .subscribe();
        } else interaction.reply({ content: 'Twitch source disabled.', ephemeral: true });
      } else {
        interaction.reply({ content: `You don't have permissions to execute this command.`, ephemeral: true });
      }
    },
  };
};
