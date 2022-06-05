import { SJSDiscordInitOpts } from './discord';

export interface StreambotJsInitOpts {
  discordOpts: SJSDiscordInitOpts;
}

export interface StreambotJsSslCert {
  key: string;
  cert: string;
}
