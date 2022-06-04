import { GuildMember, Permissions } from 'discord.js';
import moment from 'moment';
import { IConfiguration } from '../interfaces/configuration.model';

export function getNow(): string {
  return moment().format('YYYY-MM-DD HH:mm:ss.SSS');
}

export function sanitize(text: string): string {
  const unescaped = text.replace(/\\(\*|_|`|~|\\)/g, '$1');
  const escaped = unescaped.replace(/(\*|_|`|~|\\)/g, '\\$1');
  return escaped;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function hasAdministratorPrivileges(member: GuildMember, configuration: IConfiguration): boolean {
  return member.permissions.has(Permissions.FLAGS.ADMINISTRATOR) || configuration.adminUsers.includes(member.id);
}
