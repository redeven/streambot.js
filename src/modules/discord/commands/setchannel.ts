import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildMember } from 'discord.js';
import { CommandFactory } from '../../../shared/interfaces/discord.model';
import { hasAdministratorPrivileges } from '../../../shared/utils/utils';

export const SET_CHANNEL_FACTORY: CommandFactory = (configService) => {
  return {
    data: new SlashCommandBuilder()
      .setName('setchannel')
      .setDescription('Set the stream announcement channel.')
      .addStringOption((option) => option.setName('channelid').setDescription('Channel id. If empty, uses current channel id.')),
    execute: (interaction: CommandInteraction) => {
      const channelid = interaction.options.get('channelid');
      if (interaction.guild && interaction.member) {
        const MEMBER = interaction.member as GuildMember;
        if (hasAdministratorPrivileges(MEMBER, configService.getConfiguration())) {
          const CHANNEL_ID = channelid?.value?.toString() || interaction.channel?.id;
          configService.getConfiguration().guilds[interaction.guild.id].channelId = CHANNEL_ID;
          configService.saveChanges();
          interaction.reply({ content: `You set the announcement channel to <#${CHANNEL_ID}>`, ephemeral: true });
        } else {
          interaction.reply({ content: `You don't have permissions to execute this command.`, ephemeral: true });
        }
      }
    },
  };
};
