import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { CommandFactory } from '../../../shared/interfaces/discord';
import { capitalize, sanitize } from '../../../shared/utils/utils';

export const STREAMER_LIST_FACTORY: CommandFactory = (configService, sources) => {
  return {
    data: new SlashCommandBuilder().setName('streamerlist').setDescription('Show list of streamers'),
    execute: (interaction: CommandInteraction) => {
      if (interaction.guild?.id) {
        const SOURCES = Object.entries(configService.getConfiguration().guilds[interaction.guild.id].sources)
          .filter(([name, source]) => Object.keys(sources).includes(name))
          .map(
            ([name, source]) =>
              `${capitalize(name)}: ${Object.values(source)
                .map((streamer) => sanitize(streamer.displayName))
                .join(', ')}`,
          );
        interaction.reply({ content: `Channels:\n${SOURCES.join('\n')}`, ephemeral: true });
      }
    },
  };
};
