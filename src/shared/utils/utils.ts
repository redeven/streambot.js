import { GuildMember, PermissionsBitField } from 'discord.js';
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
  return member.permissions.has(PermissionsBitField.Flags.Administrator) || configuration.adminUsers.includes(member.id);
}

export function findBetweenStrings(source: string, startString: string, endString: string): string | undefined {
  const startIndex = source.indexOf(startString);
  if (startIndex !== -1) {
    const subString = source.substring(startIndex);
    const endIndex = subString.indexOf(endString);
    if (endIndex !== -1) {
      const result = subString.substring(startString.length, endIndex);
      return result;
    }
  }
  return undefined;
}
