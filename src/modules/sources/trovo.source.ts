import { Client, MessageEditOptions, MessageOptions, TextChannel } from 'discord.js';
import moment from 'moment';
import { catchError, defer, EMPTY, filter, interval, map, Observable, of, Subject, Subscription, switchMap, tap } from 'rxjs';
import { StreamerInfo } from '../../shared/interfaces/sources.model';
import {
  TrovoChannel,
  TrovoGetUsersResponse,
  TrovoSourceOpts,
  TrovoSourceStreamChanges,
  TrovoSourceSubscriptions,
  TROVO_NAME_REGEX,
} from '../../shared/interfaces/sources/trovo.source.model';
import { getNow } from '../../shared/utils/utils';
import { SJSConfiguration } from '../configuration/configuration';

export class TrovoSource {
  private readonly opts: TrovoSourceOpts;
  private readonly subscriptions: TrovoSourceSubscriptions = {};
  private readonly configService: SJSConfiguration;

  public readonly streamChanges: Subject<TrovoSourceStreamChanges> = new Subject();

  constructor(opts: TrovoSourceOpts, configService: SJSConfiguration) {
    this.configService = configService;
    this.opts = opts;
  }

  public init() {
    return of(null).pipe(
      tap(() => {
        const GUILDS = Object.values(this.configuration.guilds);
        const HAS_GUILDS = GUILDS.length > 0;
        const HAS_STREAMERS = GUILDS.some((guild) => Object.values(guild.sources.trovo).length > 0);
        if (HAS_GUILDS && HAS_STREAMERS) {
          Object.values(this.configuration.guilds).forEach((guild) => {
            const STREAMERS = Object.values(guild.sources.trovo);
            STREAMERS.forEach((streamer) => {
              this.setStreamerSubscription(guild.guildId, streamer.userId);
            });
            console.log(`[${getNow()}] [streambot.js] {Trovo} Subscribed to ${STREAMERS.length} channels on server ${guild.guildName}`);
          });
        } else {
          console.log(`[${getNow()}] [streambot.js] {Trovo} No channels to subscribe`);
        }
      }),
    );
  }

  public addStreamers(guildId: string, displayNames: string[]): Observable<StreamerInfo[]> {
    const newStreamers: string[] = [];
    for (let displayName of displayNames) {
      const streamer = Object.values(this.configuration.guilds[guildId].sources.trovo).find(
        (str) => str.displayName.toLowerCase() === displayName.toLowerCase(),
      );
      if (!streamer) newStreamers.push(displayName);
    }
    return this.getUsers(newStreamers).pipe(
      map((response) => {
        if (response === null) return [];
        return response.users
          .filter((user) => newStreamers.includes(user.username))
          .map((user) => ({ userId: user.channel_id, displayName: user.username }));
      }),
      tap((streamers) => {
        streamers.forEach((streamer) => {
          this.configuration.guilds[guildId].sources.trovo[streamer.userId] = streamer;
          this.setStreamerSubscription(guildId, streamer.userId);
        });
        this.configService.saveChanges();
      }),
    );
  }

  public removeStreamers(guildId: string, displayNames: string[]): number {
    let removedStreamers: number = 0;
    for (let displayName of displayNames) {
      const streamer = Object.values(this.configuration.guilds[guildId].sources.trovo).find(
        (str) => str.displayName.toLowerCase() === displayName.toLowerCase(),
      );
      if (streamer) {
        this.removeStreamerSubscription(guildId, streamer);
        delete this.configuration.guilds[guildId].sources.trovo[streamer.userId];
        this.configService.saveChanges();
        removedStreamers++;
      }
    }
    return removedStreamers;
  }

  public subscribeToStreamChanges(client: Client) {
    return this.streamChanges
      .pipe(
        tap((streamChanges) => {
          const settings = this.configuration.guilds[streamChanges.guildId];
          const channelId = settings.channelId;
          if (channelId) {
            defer(() => client.channels.fetch(channelId) as Promise<TextChannel>)
              .pipe(
                catchError(() => EMPTY),
                switchMap((channel) => {
                  const msgOptions: MessageOptions = {
                    content: settings.announcementMessage.replace('{DISPLAYNAME}', streamChanges.stream.username),
                    embeds: [
                      {
                        title: streamChanges.stream.live_title,
                        description: streamChanges.stream.channel_url,
                        color: 0x30c07b,
                        timestamp: new Date(),
                        footer: {
                          text: streamChanges.stream.category_name,
                        },
                        author: {
                          name: streamChanges.stream.username,
                          url: streamChanges.stream.channel_url,
                          icon_url: streamChanges.stream.profile_pic,
                        },
                        thumbnail: {
                          url: streamChanges.stream.thumbnail,
                        },
                      },
                    ],
                  };
                  const lastStreamMessageId =
                    this.configuration.guilds[streamChanges.guildId].sources.trovo[streamChanges.userId].lastStreamMessageId;
                  return lastStreamMessageId === undefined
                    ? channel.send(msgOptions)
                    : defer(() => channel.messages.fetch(lastStreamMessageId)).pipe(
                        catchError(() => of(null)),
                        switchMap((msg) => {
                          if (msg === null) return defer(() => channel.send(msgOptions));
                          const MESSAGE_TIMESTAMP = moment(msg.embeds[0].timestamp);
                          const SIX_HOURS_AGO = moment().subtract(6, 'hours');
                          return MESSAGE_TIMESTAMP.isAfter(SIX_HOURS_AGO)
                            ? defer(() => msg.edit(msgOptions as MessageEditOptions))
                            : defer(() => channel.send(msgOptions));
                        }),
                      );
                }),
                tap((message) => {
                  if (!Array.isArray(message)) {
                    const streamer = this.configuration.guilds[streamChanges.guildId].sources.trovo[streamChanges.userId];
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
    if (!this.subscriptions[guildId]) this.subscriptions[guildId] = {};
    let lastStream = { is_live: false, live_title: '', category_name: '' };
    this.subscriptions[guildId][userId] = interval(this.configuration.trovo.interval * 60 * 1000)
      .pipe(
        switchMap(() => {
          return defer(() =>
            fetch('https://open-api.trovo.live/openplatform/channels/id', {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Client-ID': this.opts.clientId,
              },
              body: JSON.stringify({ channel_id: userId }),
            }),
          ).pipe(switchMap((response) => defer(() => response.json()) as Observable<TrovoChannel>));
        }),
        filter((stream) => {
          const IS_LIVE = !lastStream.is_live && stream.is_live;
          const TITLE_CHANGED = stream.is_live && lastStream.live_title !== stream.live_title;
          const GAME_CHANGED = stream.is_live && lastStream.category_name !== stream.category_name;
          return IS_LIVE || TITLE_CHANGED || GAME_CHANGED;
        }),
        catchError(() => of(null)),
      )
      .subscribe((stream) => {
        if (stream === null) return;
        lastStream = { is_live: stream.is_live, live_title: stream.live_title, category_name: stream.category_name };
        this.streamChanges.next({ guildId, userId, stream });
      });
  }

  public removeStreamerSubscription(guildId: string, streamer: StreamerInfo) {
    (this.subscriptions[guildId][streamer.userId] as Subscription).unsubscribe();
    delete this.subscriptions[guildId][streamer.userId];
  }

  private getUsers(displayNames: string[]): Observable<TrovoGetUsersResponse | null> {
    const user = displayNames.filter((displayName) => TROVO_NAME_REGEX.test(displayName));
    return defer(() =>
      fetch('https://open-api.trovo.live/openplatform/getusers', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Client-ID': this.opts.clientId,
        },
        body: JSON.stringify({ user }),
      }),
    ).pipe(
      switchMap((response) => defer(() => response.json() as Promise<TrovoGetUsersResponse>)),
      catchError(() => of(null)),
    );
  }

  private get configuration() {
    return this.configService.getConfiguration();
  }
}
