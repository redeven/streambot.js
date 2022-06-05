import { CommandInteraction } from 'discord.js';
import { SJSConfiguration } from '../../modules/configuration/configuration';
import { TrovoSource } from '../../modules/sources/trovo.source';
import { TwitchSource } from '../../modules/sources/twitch.source';
import { TrovoSourceOpts } from './trovo.source.model';
import { TwitchSourceOpts } from './twitch.source.model';
export interface SJSDiscordInitOpts {
    token: string;
    sources: {
        twitch?: TwitchSourceOpts;
        trovo?: TrovoSourceOpts;
    };
}
export interface IDiscordSources {
    twitch?: TwitchSource;
    trovo?: TrovoSource;
}
export interface Command {
    data: any;
    execute: (interaction: CommandInteraction) => any;
}
export declare type CommandFactory = (configService: SJSConfiguration, sources: IDiscordSources) => Command;
