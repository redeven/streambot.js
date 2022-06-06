import { Client, MessageEditOptions, MessageOptions, TextChannel } from 'discord.js';
import { google, youtube_v3 } from 'googleapis';
import moment from 'moment';
import { catchError, combineLatest, defer, EMPTY, filter, iif, interval, map, of, Subject, Subscription, switchMap, tap } from 'rxjs';
import {
  YoutubeSourceOpts,
  YoutubeSourceStreamChanges,
  YoutubeSourceSubscriptions,
  YOUTUBE_CHANNEL_ID_REGEX,
} from '../../shared/interfaces/sources/youtube.source.model';
import { getNow } from '../../shared/utils/utils';
import { SJSConfiguration } from '../configuration/configuration';

export class YoutubeSource {
  private readonly api: youtube_v3.Youtube;
  private readonly subscriptions: YoutubeSourceSubscriptions = {};
  private readonly configService: SJSConfiguration;

  public readonly streamChanges: Subject<YoutubeSourceStreamChanges> = new Subject();

  constructor(opts: YoutubeSourceOpts, configService: SJSConfiguration) {
    this.api = google.youtube({ version: 'v3', auth: opts.apiKey });
    this.configService = configService;
  }

  public init() {
    return of(null).pipe(
      tap(() => {
        const GUILDS = Object.values(this.configuration.guilds);
        const HAS_GUILDS = GUILDS.length > 0;
        const HAS_STREAMERS = GUILDS.some((guild) => Object.values(guild.sources.youtube).length > 0);
        if (HAS_GUILDS && HAS_STREAMERS) {
          Object.values(this.configuration.guilds).forEach((guild) => {
            const STREAMERS = Object.values(guild.sources.youtube);
            STREAMERS.forEach((streamer) => {
              this.setStreamerSubscription(guild.guildId, streamer.userId);
            });
            console.log(`[${getNow()}] [streambot.js] {Youtube} Subscribed to ${STREAMERS.length} channels on server ${guild.guildName}`);
          });
        } else {
          console.log(`[${getNow()}] [streambot.js] {Youtube} No channels to subscribe`);
        }
      }),
    );
  }

  public addStreamers(guildId: string, displayNames: string[]) {
    const CHANNEL_IDS: string[] = [];
    const CUSTOM_URLS: string[] = [];
    const CURRENT_STREAMS = Object.values(this.configuration.guilds[guildId].sources.youtube);
    for (let name of displayNames) {
      if (YOUTUBE_CHANNEL_ID_REGEX.test(name)) {
        const EXISTS = CURRENT_STREAMS.some((streamer) => streamer.userId === name);
        if (!EXISTS) CHANNEL_IDS.push(name);
      } else {
        const EXISTS = CURRENT_STREAMS.some((streamer) => streamer.displayName === name);
        if (!EXISTS) CUSTOM_URLS.push(name);
      }
    }
    const CUSTOM_URLS$ = iif(
      () => CUSTOM_URLS.length > 0,
      combineLatest(CUSTOM_URLS.map((customUrl) => this.getChannelIdByCustomUrl(customUrl))).pipe(
        map((idsFromCustom) => idsFromCustom.filter((id) => Boolean(id)) as string[]),
      ),
      of<string[]>([]),
    );
    return CUSTOM_URLS$.pipe(
      switchMap((idsFromCustom) => {
        const FILTERED_IDS = idsFromCustom.filter((id) => !CURRENT_STREAMS.some((streamer) => streamer.userId === id));
        return defer(() => this.api.channels.list({ part: ['snippet'], id: [...CHANNEL_IDS, ...FILTERED_IDS], maxResults: 50 }));
      }),
      map((response) => response.data.items),
      map((response) =>
        response?.map((channel) => ({ userId: channel.id || '', displayName: channel.snippet?.customUrl || channel.snippet?.title || '' })),
      ),
      tap((streamers) => {
        streamers?.forEach((streamer) => {
          this.configuration.guilds[guildId].sources.youtube[streamer.userId] = streamer;
          this.setStreamerSubscription(guildId, streamer.userId);
        });
        this.configService.saveChanges();
      }),
    );
  }

  public removeStreamers(guildId: string, displayNames: string[]): number {
    const CURRENT_STREAMS = Object.values(this.configuration.guilds[guildId].sources.youtube);
    let removedStreamers: number = 0;
    for (let name of displayNames) {
      const STREAMER = YOUTUBE_CHANNEL_ID_REGEX.test(name)
        ? CURRENT_STREAMS.find((streamer) => streamer.userId === name)
        : CURRENT_STREAMS.find((streamer) => streamer.displayName === name);
      if (STREAMER) {
        this.removeStreamerSubscription(guildId, STREAMER);
        delete this.configuration.guilds[guildId].sources.youtube[STREAMER.userId];
        removedStreamers++;
      }
    }
    this.configService.saveChanges();
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
                    content: settings.announcementMessage.replace('{DISPLAYNAME}', streamChanges.stream.snippet?.channelTitle || ''),
                    embeds: [
                      {
                        title: streamChanges.stream.snippet?.title || '',
                        description: `https://www.youtube.com/watch?v=${streamChanges.stream.id?.videoId}`,
                        color: 0xff0000,
                        timestamp: new Date(),
                        footer: {
                          text: 'YouTube',
                        },
                        author: {
                          name: streamChanges.stream.snippet?.channelTitle || '',
                          url: `https://www.youtube.com/watch?v=${streamChanges.stream.id?.videoId}`,
                          icon_url: client.user?.avatar || '',
                        },
                        thumbnail: {
                          url: streamChanges.stream.snippet?.thumbnails?.default?.url || '',
                        },
                      },
                    ],
                  };
                  const lastStreamMessageId =
                    this.configuration.guilds[streamChanges.guildId].sources.youtube[streamChanges.userId].lastStreamMessageId;
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
                    const streamer = this.configuration.guilds[streamChanges.guildId].sources.youtube[streamChanges.userId];
                    streamer.lastStreamMessageId = message.id;
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
    this.subscriptions[guildId][userId] = interval(this.configuration.youtube.interval * 60 * 1000)
      .pipe(
        switchMap(() => {
          return defer(() =>
            this.api.search.list({
              part: ['snippet'],
              type: ['video'],
              eventType: 'live',
              channelId: userId,
            }),
          ).pipe(map((response) => response.data.items || []));
        }),
        filter((streams) => {
          const IS_LIVE = !lastStream.is_live && streams.length > 0;
          const TITLE_CHANGED = streams.length > 0 && lastStream.live_title !== streams[0].snippet?.title;
          return IS_LIVE || TITLE_CHANGED;
        }),
        map((streams) => streams[0]),
        catchError(() => of(null)),
      )
      .subscribe((stream) => {
        if (stream === null) return;
        lastStream = { is_live: true, live_title: stream.snippet?.title || '', category_name: 'YouTube' };
        this.streamChanges.next({ guildId, userId, stream });
      });
  }

  public removeStreamerSubscription(guildId: string, streamer: any) {
    (this.subscriptions[guildId][streamer.userId] as Subscription).unsubscribe();
    delete this.subscriptions[guildId][streamer.userId];
  }

  private getChannelIdByCustomUrl(customUrl: string) {
    return defer(() => this.api.search.list({ part: ['snippet'], type: ['channel'], q: customUrl, maxResults: 50 })).pipe(
      map((response) => {
        const channelIds: string[] = [];
        response.data.items?.forEach((item) => {
          const id = item.id?.channelId;
          if (id) channelIds.push(id);
        });
        return channelIds;
      }),
      switchMap((channelIds) => {
        if (channelIds.length) {
          return defer(() => this.api.channels.list({ part: ['snippet'], id: channelIds }));
        } else {
          return of(null);
        }
      }),
      map((response) => response?.data.items?.filter((item) => item.snippet?.customUrl?.toLowerCase() === customUrl.toLowerCase()) || []),
      map((response) => (response.length && response[0].id ? response[0].id : null)),
    );
  }

  private get configuration() {
    return this.configService.getConfiguration();
  }
}
