import { ApiClient } from '@twurple/api';
import { ClientCredentialsAuthProvider } from '@twurple/auth';
import { DirectConnectionAdapter, EventSubHttpListener, EventSubHttpListenerCertificateConfig, EventSubMiddleware } from '@twurple/eventsub-http';
import { EventSubStreamOnlineEvent } from '@twurple/eventsub-base';
import { Client, BaseMessageOptions, TextChannel } from 'discord.js';
import moment from 'moment';
import { catchError, combineLatest, defer, EMPTY, filter, iif, interval, map, of, Subject, switchMap, take, tap } from 'rxjs';
import { DEFAULT_ANNOUNCEMENT } from '../../shared/interfaces/discord.model';
import { StreamerInfo } from '../../shared/interfaces/sources.model';
import {
  TwitchInvalidSubscription,
  TwitchSourceOpts,
  TwitchSourceStreamChanges,
  TwitchSourceSubscriptions,
  TWITCH_NAME_REGEX,
} from '../../shared/interfaces/sources/twitch.source.model';
import { getNow } from '../../shared/utils/utils';
import { SJSConfiguration } from '../configuration/configuration';
import { SJSLogging } from '../logging/logging';

export class TwitchSource {
  private readonly apiClient: ApiClient;
  private readonly eventSubListener: EventSubHttpListener;
  private readonly eventSubMiddleware: EventSubMiddleware;
  private readonly isExpressMiddleware: boolean;
  private readonly subscriptions: TwitchSourceSubscriptions = {};
  private readonly configService: SJSConfiguration;

  public streamChanges: Subject<TwitchSourceStreamChanges> = new Subject();

  constructor(opts: TwitchSourceOpts, sslCert: EventSubHttpListenerCertificateConfig, configService: SJSConfiguration) {
    this.isExpressMiddleware = Boolean(opts.expressMiddleware);
    this.configService = configService;
    const { clientId, clientSecret, hostName } = opts;
    const authProvider = new ClientCredentialsAuthProvider(clientId, clientSecret);
    const adapter = new DirectConnectionAdapter({ hostName, sslCert });
    this.apiClient = new ApiClient({ authProvider });
    this.eventSubListener = new EventSubHttpListener({
      apiClient: this.apiClient,
      secret: clientSecret,
      adapter,
      logger: { minLevel: 0, emoji: false },
      strictHostCheck: true,
    });
    this.eventSubMiddleware = new EventSubMiddleware({
      apiClient: this.apiClient,
      hostName,
      pathPrefix: '/twitch',
      secret: clientSecret,
      strictHostCheck: true,
    });
  }

  public init(opts: TwitchSourceOpts) {
    return iif(
      () => this.isExpressMiddleware,
      defer(() => this.eventSubMiddleware.markAsReady()),
      defer(() => this.eventSubListener.start()),
    ).pipe(
      tap(() => {
        SJSLogging.log(`[${getNow()}] [streambot.js] {Twitch} Listening`);
      }),
      switchMap(() => {
        return iif(
          () => {
            const GUILDS = Object.values(this.configuration.guilds);
            const HAS_GUILDS = GUILDS.length > 0;
            const HAS_STREAMERS = GUILDS.some((guild) => Object.values(guild.sources.twitch).length > 0);
            return HAS_GUILDS && HAS_STREAMERS;
          },
          combineLatest(
            Object.values(this.configuration.guilds).map((guild) =>
              combineLatest(Object.values(guild.sources.twitch).map((streamer) => this.setStreamerSubscription(guild.guildId, streamer.userId))).pipe(
                tap((streamers) => {
                  SJSLogging.log(`[${getNow()}] [streambot.js] {Twitch} Subscribed to ${streamers.length} channels on server ${guild.guildName}`);
                }),
              ),
            ),
          ),
          of(null).pipe(
            tap(() => {
              SJSLogging.log(`[${getNow()}] [streambot.js] {Twitch} No channels to subscribe`);
            }),
          ),
        );
      }),
      switchMap(() => this.reauthorizeInvalidSubscriptions()),
      tap(() => this.schedulePeriodicReauthorization()),
    );
  }

  public addStreamers(guildId: string, displayNames: string[]) {
    const newStreamers = [];
    for (let displayName of displayNames) {
      const streamer = Object.values(this.configuration.guilds[guildId].sources.twitch).find(
        (str) => str.displayName.toLowerCase() === displayName.toLowerCase(),
      );
      if (!streamer) newStreamers.push(this.getUser(displayName));
    }
    return combineLatest(newStreamers).pipe(
      take(1),
      map((streamers) => streamers.filter((streamer) => streamer !== null) as StreamerInfo[]),
      tap((streamers) => {
        streamers.forEach((streamer) => {
          this.configuration.guilds[guildId].sources.twitch[streamer.userId] = streamer;
          this.configService.saveChanges();
          SJSLogging.debug(`[${getNow()}] [streambot.js]: {Twitch} Streamer added: ${streamer.displayName} (${streamer.userId})`);
          this.setStreamerSubscription(guildId, streamer.userId).subscribe();
        });
      }),
    );
  }

  public removeStreamers(guildId: string, displayNames: string[]) {
    const allStreamers = Object.values(this.configuration.guilds[guildId].sources.twitch);
    const foundStreamers = displayNames
      .map((displayName) => allStreamers.find((str) => str.displayName.toLowerCase() === displayName.toLowerCase()))
      .filter((streamer) => streamer) as StreamerInfo[];
    const removeStreamers = foundStreamers.map((streamer) => this.removeStreamerSubscription(guildId, streamer));
    return combineLatest(removeStreamers);
  }

  public subscribeToStreamChanges(client: Client) {
    return this.streamChanges
      .pipe(
        tap((streamChanges) => {
          SJSLogging.debug(`[${getNow()}] StreamChanges:`, streamChanges);
          const settings = this.configuration.guilds[streamChanges.guildId];
          const channelId = settings.channelId;
          if (channelId) {
            combineLatest([
              defer(() => streamChanges.stream.getBroadcaster()),
              defer(() => streamChanges.stream.getStream()),
              defer(() => client.channels.fetch(channelId) as Promise<TextChannel>),
            ])
              .pipe(
                catchError(() => EMPTY),
                switchMap(([broadcaster, stream, channel]) => {
                  if (!stream) return EMPTY;
                  const msgOptions: BaseMessageOptions = {
                    content: (settings.announcementMessage || DEFAULT_ANNOUNCEMENT).replace('{DISPLAYNAME}', broadcaster.displayName),
                    embeds: [
                      {
                        title: stream.title,
                        description: `https://www.twitch.tv/${broadcaster.displayName}`,
                        color: 0x9147ff,
                        timestamp: new Date().toISOString(),
                        footer: {
                          text: stream.gameName,
                        },
                        author: {
                          name: broadcaster.displayName,
                          url: `https://www.twitch.tv/${broadcaster.displayName}`,
                          icon_url: broadcaster.profilePictureUrl,
                        },
                        thumbnail: {
                          url: stream.thumbnailUrl.replace('{width}', '320').replace('{height}', '180'),
                        },
                      },
                    ],
                  };
                  const lastStreamMessageId =
                    this.configuration.guilds[streamChanges.guildId].sources.twitch[streamChanges.userId].lastStreamMessageId;
                  return lastStreamMessageId === undefined
                    ? defer(() => channel.send(msgOptions))
                    : defer(() => channel.messages.fetch(lastStreamMessageId)).pipe(
                        catchError(() => of(null)),
                        switchMap((msg) => {
                          if (msg === null) return defer(() => channel.send(msgOptions));
                          const MESSAGE_TIMESTAMP = moment(msg.embeds[0].timestamp);
                          const SIX_HOURS_AGO = moment().subtract(6, 'hours');
                          return MESSAGE_TIMESTAMP.isAfter(SIX_HOURS_AGO) ? defer(() => msg.edit(msgOptions)) : defer(() => channel.send(msgOptions));
                        }),
                      );
                }),
                tap((message) => {
                  if (!Array.isArray(message)) {
                    const streamer = this.configuration.guilds[streamChanges.guildId].sources.twitch[streamChanges.userId];
                    streamer.lastStreamMessageId = message.id;
                    if (message.embeds[0].author?.name) {
                      streamer.displayName = message.embeds[0].author.name;
                    }
                    this.configService.saveChanges();
                  }
                }),
              )
              .subscribe();
          }
        }),
      )
      .subscribe();
  }

  public setStreamerSubscription(guildId: string, userId: string) {
    const streamChanges = this.streamChanges;
    const onStreamEvent = (stream: EventSubStreamOnlineEvent) => {
      if (stream) {
        SJSLogging.debug(`[${getNow()}] [streambot.js]: {Twitch} Stream online event: ${stream.broadcasterName} (${stream.broadcasterId})`);
        streamChanges.next({ guildId, userId, stream });
      }
    };
    return iif(
      () => this.isExpressMiddleware,
      defer(() => this.eventSubMiddleware.subscribeToStreamOnlineEvents(userId, onStreamEvent)),
      defer(() => this.eventSubListener.subscribeToStreamOnlineEvents(userId, onStreamEvent)),
    ).pipe(
      take(1),
      tap((subscription) => {
        SJSLogging.debug(`[${getNow()}] [streambot.js] {Twitch} Subscription set: ${userId} (${subscription.verified})`);
        if (!this.subscriptions[guildId]) this.subscriptions[guildId] = {};
        this.subscriptions[guildId][userId] = subscription;
      }),
    );
  }

  public removeStreamerSubscription(guildId: string, streamer: StreamerInfo) {
    const subscription = this.subscriptions[guildId][streamer.userId];
    return defer(() => subscription.stop()).pipe(
      tap(() => {
        SJSLogging.debug(`[${getNow()}] [streambot.js]: {Twitch} Subscription removed: ${streamer.displayName} (${streamer.userId})`);
        delete this.subscriptions[guildId][streamer.userId];
        delete this.configuration.guilds[guildId].sources.twitch[streamer.userId];
        this.configService.saveChanges();
      }),
    );
  }

  public getAllSubscriptionsStatus(): string {
    return Object.entries(this.subscriptions)
      .map(([guildId, subscriptions]) => {
        const guildSubs = Object.entries(subscriptions)
          .map(([userId, sub]) => `${this.configuration.guilds[guildId].sources.twitch[userId].displayName}: ${sub.verified}`)
          .join('\n');
        return `Guild ${this.configuration.guilds[guildId].guildName}:\n` + guildSubs;
      })
      .join('\n\n');
  }

  public reauthorizeInvalidSubscriptions() {
    const INVALID_SUBSCRIPTIONS: TwitchInvalidSubscription[] = [];
    Object.entries(this.subscriptions).forEach(([guildId, userIds]) => {
      Object.entries(userIds).forEach(([userId, subscription]) => {
        if (!subscription.verified) {
          INVALID_SUBSCRIPTIONS.push({ guildId, userId, subscription });
        }
      });
    });
    const NEW_SUBSCRIPTIONS = INVALID_SUBSCRIPTIONS.map((invalid) => {
      return defer(() => invalid.subscription.stop()).pipe(switchMap(() => this.setStreamerSubscription(invalid.guildId, invalid.userId)));
    });
    return iif(() => NEW_SUBSCRIPTIONS.length > 0, combineLatest(NEW_SUBSCRIPTIONS), of([])).pipe(
      tap((subscriptions) => {
        SJSLogging.log(`[${getNow()}] [streambot.js] {Twitch} Reauthorized ${subscriptions.length} subscriptions`);
      }),
    );
  }

  public schedulePeriodicReauthorization() {
    return interval(60000)
      .pipe(
        filter(() => {
          return Object.entries(this.subscriptions).some(([guildId, subscriptions]) =>
            Object.entries(subscriptions).some(([userId, sub]) => !sub.verified),
          );
        }),
        switchMap(() => this.reauthorizeInvalidSubscriptions()),
        catchError(() => of(null)),
      )
      .subscribe();
  }

  private getUser(userName: string) {
    return iif(
      () => TWITCH_NAME_REGEX.test(userName),
      defer(() => this.apiClient.users.getUserByName(userName)),
      of(null),
    ).pipe(
      catchError(() => of(null)),
      map((user) => {
        if (user) {
          SJSLogging.debug(`[${getNow()}] [streambot.js]: {Twitch} Streamer found: ${user.displayName} (${user.id})`);
          return { userId: user.id, displayName: user.displayName };
        } else {
          SJSLogging.debug(`[${getNow()}] [streambot.js]: {Twitch} Streamer not found: ${userName}`);
          return null;
        }
      }),
    );
  }

  private get configuration() {
    return this.configService.getConfiguration();
  }

  public get expressMiddleware() {
    return this.eventSubMiddleware;
  }
}
