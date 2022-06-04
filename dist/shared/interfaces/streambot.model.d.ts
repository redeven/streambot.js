import { SJSDiscordInitOpts } from './discord';
import { TrovoSourceOpts } from './trovo.source.model';
import { TwitchSourceOpts } from './twitch.source.model';
export interface StreambotJsInitOpts {
    discordOpts: SJSDiscordInitOpts;
    sources: {
        twitch: TwitchSourceOpts;
        trovo: TrovoSourceOpts;
    };
}
export interface StreambotJsSslCert {
    key: string;
    cert: string;
}
