import { SJSDiscordInitOpts } from './discord.model';

export interface StreambotJsInitOpts {
  discordOpts: SJSDiscordInitOpts;
}

export interface StreambotJsSslCert {
  key: string;
  cert: string;
}
