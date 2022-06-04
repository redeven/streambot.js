import { EventSubListenerCertificateConfig, EventSubMiddleware } from '@twurple/eventsub';
import { Client } from 'discord.js';
import { Subject } from 'rxjs';
import { StreamerInfo } from '../../shared/interfaces/sources.model';
import { TwitchSourceOpts, TwitchSourceStreamChanges } from '../../shared/interfaces/twitch.source.model';
import { SJSConfiguration } from '../configuration/configuration';
export declare class TwitchSource {
    private readonly apiClient;
    private readonly eventSubListener;
    private readonly eventSubMiddleware;
    private readonly isExpressMiddleware;
    private readonly subscriptions;
    private readonly configService;
    streamChanges: Subject<TwitchSourceStreamChanges>;
    constructor(opts: TwitchSourceOpts, sslCert: EventSubListenerCertificateConfig, configService: SJSConfiguration);
    init(): import("rxjs").Observable<import("@twurple/eventsub").EventSubSubscription<unknown>[]>;
    addStreamers(guildId: string, displayNames: string[]): import("rxjs").Observable<StreamerInfo[]>;
    removeStreamers(guildId: string, displayNames: string[]): import("rxjs").Observable<void[]>;
    subscribeToStreamChanges(client: Client): import("rxjs").Subscription;
    setStreamerSubscription(guildId: string, userId: string): import("rxjs").Observable<import("@twurple/eventsub").EventSubSubscription<unknown>>;
    removeStreamerSubscription(guildId: string, streamer: StreamerInfo): import("rxjs").Observable<void>;
    getAllSubscriptionsStatus(): string;
    reauthorizeInvalidSubscriptions(): import("rxjs").Observable<import("@twurple/eventsub").EventSubSubscription<unknown>[]>;
    private getUser;
    private get configuration();
    get expressMiddleware(): EventSubMiddleware;
}
