import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildMember } from 'discord.js';
import { defer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CommandFactory } from '../../../shared/interfaces/discord';
import { SOURCE_CHOICES } from '../../../shared/interfaces/sources.model';
import { hasAdministratorPrivileges } from '../../../shared/utils/utils';

export const DEL_STREAMERS_FACTORY: CommandFactory = (configService, sources) => {
  return {
    data: new SlashCommandBuilder()
      .setName('delstreamers')
      .setDescription('Subscribe to streamers to display stream announcements from.')
      .addStringOption((option) =>
        option
          .setName('source')
          .setDescription(`Source.`)
          .setRequired(true)
          .addChoices(...SOURCE_CHOICES.map((choice) => ({ value: choice, name: choice }))),
      )
      .addStringOption((option) => option.setName('channels').setDescription('List of channels to subscribe (space-separated)').setRequired(true)),
    execute: (interaction: CommandInteraction) => {
      const _source = interaction.options.get('source');
      const _channels = interaction.options.get('channels');
      if (interaction.guild && interaction.member && _source && _channels) {
        const GUILD = interaction.guild;
        const MEMBER = interaction.member as GuildMember;
        if (hasAdministratorPrivileges(MEMBER, configService.getConfiguration())) {
          const CHANNELS = _channels.value?.toString().split(' ') || [];
          switch (_source.value) {
            case 'twitch':
              defer(() => interaction.deferReply({ ephemeral: true }))
                .pipe(
                  switchMap(() => sources.twitch.removeStreamers(GUILD.id, CHANNELS)),
                  switchMap((streamers) =>
                    defer(() => interaction.editReply({ content: `Removed ${streamers.length} Twitch channel${streamers.length === 1 ? '' : 's'}` })),
                  ),
                )
                .subscribe();
              break;
            case 'trovo':
              const removedStreamers = sources.trovo.removeStreamers(GUILD.id, CHANNELS);
              interaction.reply({ content: `Removed ${removedStreamers} Trovo channel${removedStreamers === 1 ? '' : 's'}`, ephemeral: true });
              break;
            default:
              interaction.reply({ content: `Incorrect source type.`, ephemeral: true });
          }
        } else {
          interaction.reply({ content: `You don't have permissions to execute this command.`, ephemeral: true });
        }
      }
    },
  };
};
