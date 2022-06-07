import { CommandInteraction } from 'discord.js';
import { SJSConfiguration } from '../../modules/configuration/configuration';
import { TrovoSource } from '../../modules/sources/trovo.source';
import { TwitchSource } from '../../modules/sources/twitch.source';
import { YoutubeSource } from '../../modules/sources/youtube.source';
import { TrovoSourceOpts } from './sources/trovo.source.model';
import { TwitchSourceOpts } from './sources/twitch.source.model';
import { YoutubeSourceOpts } from './sources/youtube.source.model';
export interface SJSDiscordInitOpts {
    token: string;
    sources: {
        twitch?: TwitchSourceOpts;
        trovo?: TrovoSourceOpts;
        youtube?: YoutubeSourceOpts;
    };
}
export interface IDiscordSources {
    twitch?: TwitchSource;
    trovo?: TrovoSource;
    youtube?: YoutubeSource;
}
export interface Command {
    data: any;
    execute: (interaction: CommandInteraction) => any;
}
export declare type CommandFactory = (configService: SJSConfiguration, sources: IDiscordSources) => Command;
export declare const DEFAULT_ANNOUNCEMENT = "**{DISPLAYNAME}** started streaming!";
