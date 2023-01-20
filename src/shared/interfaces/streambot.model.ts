import { SJSDiscordInitOpts } from './discord.model';
import { LogLevel } from '../../modules/logging/logging';

export interface StreambotJsInitOpts {
  discordOpts: SJSDiscordInitOpts;
  logLevel?: LogLevel;
}

export interface StreambotJsSslCert {
  key: string;
  cert: string;
}
