import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildMember } from 'discord.js';
import { CommandFactory } from '../../../shared/interfaces/discord';
import { hasAdministratorPrivileges } from '../../../shared/utils/utils';

export const SET_MESSAGE_FACTORY: CommandFactory = (configService) => {
  return {
    data: new SlashCommandBuilder()
      .setName('setmessage')
      .setDescription('Set the stream announcement message.')
      .addStringOption((option) => option.setName('message').setDescription('Message to send. Placeholders: {DISPLAYNAME}').setRequired(true)),
    execute: (interaction: CommandInteraction) => {
      const message = interaction.options.get('message');
      if (interaction.guild && interaction.member && message) {
        const MEMBER = interaction.member as GuildMember;
        if (hasAdministratorPrivileges(MEMBER, configService.getConfiguration())) {
          configService.getConfiguration().guilds[interaction.guild.id].announcementMessage = `${message.value}`;
          configService.saveChanges();
          interaction.reply({ content: `You set the announcement message to \`${message.value}\``, ephemeral: true });
        } else {
          interaction.reply({ content: `You don't have permissions to execute this command.`, ephemeral: true });
        }
      }
    },
  };
};
