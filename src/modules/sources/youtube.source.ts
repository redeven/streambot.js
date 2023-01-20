import { Client, BaseMessageOptions, TextChannel } from 'discord.js';
import { google, youtube_v3 } from 'googleapis';
import moment from 'moment';
import parse from 'node-html-parser';
import { catchError, combineLatest, defer, EMPTY, filter, iif, interval, map, Observable, of, Subject, Subscription, switchMap, tap } from 'rxjs';
import { DEFAULT_ANNOUNCEMENT } from '../../shared/interfaces/discord.model';
import {
  YoutubeCustomUrlResult,
  YoutubeSourceOpts,
  YoutubeSourceStreamChanges,
  YoutubeSourceSubscriptions,
  YOUTUBE_CHANNEL_ID_REGEX,
} from '../../shared/interfaces/sources/youtube.source.model';
import { findBetweenStrings, getNow } from '../../shared/utils/utils';
import { SJSConfiguration } from '../configuration/configuration';
import { SJSLogging } from '../logging/logging';

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
            SJSLogging.log(`[${getNow()}] [streambot.js] {Youtube} Subscribed to ${STREAMERS.length} channels on server ${guild.guildName}`);
          });
        } else {
          SJSLogging.log(`[${getNow()}] [streambot.js] {Youtube} No channels to subscribe`);
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
      combineLatest(CUSTOM_URLS.map((customUrl) => this.getChannelIdByCustomUrl(customUrl))),
      of<YoutubeCustomUrlResult[]>([]),
    );
    return CUSTOM_URLS$.pipe(
      map((results) => {
        const MAPPED_IDS: YoutubeCustomUrlResult[] = CHANNEL_IDS.map((channelId) => ({ customUrl: null, channelId }));
        return [...results, ...MAPPED_IDS];
      }),
      tap((results) => {
        results.forEach((streamer) => {
          if (streamer.channelId) {
            this.configuration.guilds[guildId].sources.youtube[streamer.channelId] = {
              userId: streamer.channelId,
              displayName: streamer.customUrl || '',
            };
            this.setStreamerSubscription(guildId, streamer.channelId);
          }
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
        : CURRENT_STREAMS.find((streamer) => streamer.displayName === name && streamer.displayName !== '');
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
          SJSLogging.debug(`[${getNow()}] StreamChanges:`, streamChanges);
          const settings = this.configuration.guilds[streamChanges.guildId];
          const channelId = settings.channelId;
          if (channelId) {
            defer(() => client.channels.fetch(channelId) as Promise<TextChannel>)
              .pipe(
                catchError(() => EMPTY),
                switchMap((channel) => {
                  const msgOptions: BaseMessageOptions = {
                    content: (settings.announcementMessage || DEFAULT_ANNOUNCEMENT).replace('{DISPLAYNAME}', streamChanges.stream.author || '???'),
                    embeds: [
                      {
                        title: streamChanges.stream.title,
                        description: streamChanges.stream.url,
                        color: 0xff0000,
                        timestamp: new Date().toISOString(),
                        footer: {
                          text: 'YouTube',
                        },
                        author: {
                          name: streamChanges.stream.author || 'YouTube',
                          url: streamChanges.stream.url,
                          icon_url: client.user?.avatarURL() || '',
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
                          return MESSAGE_TIMESTAMP.isAfter(SIX_HOURS_AGO) ? defer(() => msg.edit(msgOptions)) : defer(() => channel.send(msgOptions));
                        }),
                      );
                }),
                tap((message) => {
                  if (!Array.isArray(message)) {
                    const streamer = this.configuration.guilds[streamChanges.guildId].sources.youtube[streamChanges.userId];
                    streamer.displayName = streamChanges.stream.author || '';
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
          return defer(() => fetch(`https://youtube.com/channel/${userId}/live`)).pipe(
            switchMap((response) => defer(() => response.text())),
            map((htmlText) => {
              const IS_STREAM = htmlText.match(/(?<=hlsManifestUrl":").*\.m3u8/g);
              if (IS_STREAM) {
                const html = parse(htmlText);
                const url = html.querySelector('link[rel=canonical]')?.attributes.href || '';
                const title = html.querySelector('meta[name="title"]')?.attributes.content || '';
                const author = findBetweenStrings(htmlText, `"author":"`, `","`);
                return { url, title, author };
              } else {
                return null;
              }
            }),
          );
        }),
        filter((stream) => {
          const IS_LIVE = !lastStream.is_live && stream !== null;
          const TITLE_CHANGED = stream !== null && lastStream.live_title !== stream.title;
          return IS_LIVE || TITLE_CHANGED;
        }),
        catchError(() => of(null)),
      )
      .subscribe((stream) => {
        if (stream === null) return;
        lastStream = { is_live: true, live_title: stream.title, category_name: 'YouTube' };
        SJSLogging.debug(`[${getNow()}] YouTube Stream:`, lastStream);
        this.streamChanges.next({ guildId, userId, stream });
      });
  }

  public removeStreamerSubscription(guildId: string, streamer: any) {
    (this.subscriptions[guildId][streamer.userId] as Subscription).unsubscribe();
    delete this.subscriptions[guildId][streamer.userId];
  }

  private getChannelIdByCustomUrl(customUrl: string): Observable<YoutubeCustomUrlResult> {
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
          return defer(() => this.api.channels.list({ part: ['snippet'], id: channelIds, maxResults: 50 }));
        } else {
          return of(null);
        }
      }),
      map((response) => response?.data.items?.filter((item) => item.snippet?.customUrl?.toLowerCase() === customUrl.toLowerCase()) || []),
      map((response) => (response.length && response[0].id ? response[0].id : null)),
      map((response) => ({ customUrl, channelId: response })),
    );
  }

  private get configuration() {
    return this.configService.getConfiguration();
  }
}
