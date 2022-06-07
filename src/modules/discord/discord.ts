import { REST } from '@discordjs/rest';
import { Client, Collection, Guild, Intents, Interaction, Options } from 'discord.js';
import { defaultsDeep } from 'lodash';
import { catchError, combineLatest, defer, EMPTY, iif, Observable, of, switchMap, tap } from 'rxjs';
import { IGuildConfiguration } from '../../shared/interfaces/configuration.model';
import { Command, DEFAULT_ANNOUNCEMENT, IDiscordSources, SJSDiscordInitOpts } from '../../shared/interfaces/discord.model';
import { getNow } from '../../shared/utils/utils';
import { SJSConfiguration } from '../configuration/configuration';
import { Routes } from 'discord-api-types/v9';
import { Commands } from './commands';
import { TwitchSource } from '../sources/twitch.source';
import { TrovoSource } from '../sources/trovo.source';
import { YoutubeSource } from '../sources/youtube.source';
import { EventSubListenerCertificateConfig } from '@twurple/eventsub/lib';

export class SJSDiscord {
  private configService: SJSConfiguration;
  private client: Client;
  private rest: REST;
  private commands: Collection<string, Command> = new Collection();
  private sources: IDiscordSources = {};

  constructor(opts: SJSDiscordInitOpts, configService: SJSConfiguration, sslCert: EventSubListenerCertificateConfig) {
    this.configService = configService;
    this.rest = new REST({ version: '9' }).setToken(opts.token);
    this.client = new Client({
      intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
      makeCache: Options.cacheWithLimits({
        MessageManager: {
          maxSize: 50,
        },
      }),
    });
    this.client.on('ready', this.onReady.bind(this));
    this.client.on('guildCreate', this.onGuildCreate.bind(this));
    this.client.on('guildDelete', this.onGuildDelete.bind(this));
    this.client.on('guildDelete', this.onGuildDelete.bind(this));
    this.client.on('interactionCreate', this.onInteractionCreate.bind(this));
    if (opts.sources.twitch) this.sources.twitch = new TwitchSource(opts.sources.twitch, sslCert, configService);
    if (opts.sources.trovo) this.sources.trovo = new TrovoSource(opts.sources.trovo, configService);
    if (opts.sources.youtube) this.sources.youtube = new YoutubeSource(opts.sources.youtube, configService);
    this.setBotCommands();
  }

  public init(opts: SJSDiscordInitOpts) {
    const INIT_CHAIN: Observable<any>[] = [defer(() => this.client.login(opts.token))];
    if (opts.sources.twitch && this.sources.twitch) {
      const SOURCE = this.sources.twitch;
      INIT_CHAIN.push(SOURCE.init(opts.sources.twitch).pipe(tap(() => SOURCE.subscribeToStreamChanges(this.client))));
    }
    if (opts.sources.trovo && this.sources.trovo) {
      const SOURCE = this.sources.trovo;
      INIT_CHAIN.push(SOURCE.init().pipe(tap(() => SOURCE.subscribeToStreamChanges(this.client))));
    }
    if (opts.sources.youtube && this.sources.youtube) {
      const SOURCE = this.sources.youtube;
      INIT_CHAIN.push(SOURCE.init().pipe(tap(() => SOURCE.subscribeToStreamChanges(this.client))));
    }
    return combineLatest(INIT_CHAIN);
  }

  private setBotCommands(): void {
    for (let factory of Object.values(Commands)) {
      const command = factory(this.configService, this.sources);
      this.commands.set(command.data.name, command);
    }
  }

  private registerBotCommands(clientId: string) {
    return (
      defer(() =>
        this.rest.put(Routes.applicationCommands(clientId) as unknown as `/${string}`, {
          body: this.commands.map((command) => command.data.toJSON()),
        }),
      ) as Observable<any[]>
    ).pipe(catchError(() => of(null)));
  }

  private removeDeprecatedCommands() {
    if (this.client.application) {
      const app = this.client.application;
      return defer(() => app.commands.fetch()).pipe(
        switchMap((commands) => {
          const CURRENT_COMMANDS = this.commands.map((cmd) => cmd.data.name);
          const COMMANDS_TO_DELETE = commands.filter((cmd) => !CURRENT_COMMANDS.includes(cmd.name));
          return iif(
            () => COMMANDS_TO_DELETE.size > 0,
            combineLatest(COMMANDS_TO_DELETE.map((cmd) => defer(() => cmd.delete()))).pipe(
              tap(() => {
                console.log(`[${getNow()}] [streambot.js] {Discord} Cleaned up ${COMMANDS_TO_DELETE.size} deprecated commands`);
              }),
            ),
            EMPTY,
          );
        }),
      );
    } else return EMPTY;
  }

  private onReady(): void {
    this.client.user?.setActivity(this.configuration.botStatus, { type: 'PLAYING' });
    this.client.guilds.cache.each((guild) => {
      const settings = this.configuration.guilds[guild.id];
      if (settings) {
        defaultsDeep(settings, this.getGuildDefaults(guild));
        settings.guildName = guild.name;
      } else {
        this.configuration.guilds[guild.id] = this.getGuildDefaults(guild);
      }
    });
    if (this.client.user) {
      this.registerBotCommands(this.client.user.id)
        .pipe(
          switchMap((result) => {
            if (result) {
              return this.removeDeprecatedCommands();
            } else {
              console.error(`[${getNow()}] [streambot.js] {Discord} Failed to register global commands`);
              return EMPTY;
            }
          }),
        )
        .subscribe();
    }
    this.configService.saveChanges();
    console.log(`[${getNow()}] [streambot.js] {Discord} Logged in as ${this.client.user?.tag}`);
  }

  private onGuildCreate(guild: Guild): void {
    const settings = this.configuration.guilds[guild.id];
    if (settings) {
      defaultsDeep(settings, this.getGuildDefaults(guild));
      settings.guildName = guild.name;
    } else {
      this.configuration.guilds[guild.id] = this.getGuildDefaults(guild);
    }
    this.configService.saveChanges();
  }

  private onGuildDelete(guild: Guild): void {
    if (this.configuration.guilds[guild.id]) {
      delete this.configuration.guilds[guild.id];
    }
    this.configService.saveChanges();
  }

  private onInteractionCreate(interaction: Interaction) {
    if (!interaction.isCommand()) return;
    const COMMAND = this.commands.get(interaction.commandName);
    COMMAND?.execute(interaction);
  }

  private getGuildDefaults(guild: Guild): IGuildConfiguration {
    return {
      guildId: guild.id,
      guildName: guild.name,
      announcementMessage: DEFAULT_ANNOUNCEMENT,
      sources: {
        twitch: {},
        trovo: {},
        youtube: {},
      },
    };
  }

  private get configuration() {
    return this.configService.getConfiguration();
  }

  public get expressMiddleware() {
    return this.sources.twitch?.expressMiddleware;
  }
}
