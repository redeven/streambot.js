import { IConfiguration } from '../shared/interfaces/configuration.model';
import { StreambotJsInitOpts, StreambotJsSslCert } from '../shared/interfaces/streambot.model';
import { SJSConfiguration } from './configuration/configuration';
import { SJSDiscord } from './discord/discord';
import { SJSLogging, LogLevel } from './logging/logging';

export class StreambotJs {
  private readonly configService: SJSConfiguration;
  private readonly discord: SJSDiscord;
  private readonly sslCert: StreambotJsSslCert;

  constructor(opts: StreambotJsInitOpts, sslCert: StreambotJsSslCert) {
    this.configService = new SJSConfiguration();
    this.sslCert = sslCert;
    this.discord = new SJSDiscord(opts.discordOpts, this.configService, this.sslCert);
    SJSLogging.setLogLevel(opts.logLevel ?? LogLevel.Basic);
  }

  public init(opts: StreambotJsInitOpts) {
    return this.discord.init(opts.discordOpts);
  }

  public setConfiguration(configuration: IConfiguration) {
    this.configService.setConfiguration(configuration);
  }

  public get configurationChanges() {
    return this.configService.configurationChanges;
  }

  public get expressMiddleware() {
    return this.discord.expressMiddleware;
  }
}
