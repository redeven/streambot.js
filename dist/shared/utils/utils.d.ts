import { GuildMember } from 'discord.js';
import { IConfiguration } from '../interfaces/configuration.model';
export declare function getNow(): string;
export declare function sanitize(text: string): string;
export declare function capitalize(text: string): string;
export declare function hasAdministratorPrivileges(member: GuildMember, configuration: IConfiguration): boolean;
export declare function findBetweenStrings(source: string, startString: string, endString: string): string | undefined;
