import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { defer, switchMap } from 'rxjs';
import { CommandFactory } from '../../../shared/interfaces/discord';

export const REAUTHORIZE_FACTORY: CommandFactory = (configService, sources) => {
  return {
    data: new SlashCommandBuilder().setName('reauthorize').setDescription('Refresh invalid Twitch subscriptions to repair SSL verification'),
    execute: (interaction: CommandInteraction) => {
      if (configService.getConfiguration().adminUsers.includes(interaction.member?.user.id || '')) {
        if (sources.twitch) {
          const SOURCE = sources.twitch;
          defer(() => interaction.deferReply({ ephemeral: true }))
            .pipe(
              switchMap(() => SOURCE.reauthorizeInvalidSubscriptions()),
              switchMap(() => defer(() => interaction.editReply({ content: 'Finished refreshing all Twitch subscriptions' }))),
            )
            .subscribe();
        } else interaction.reply({ content: 'Twitch source disabled.', ephemeral: true });
      } else {
        interaction.reply({ content: `You don't have permissions to execute this command.`, ephemeral: true });
      }
    },
  };
};
