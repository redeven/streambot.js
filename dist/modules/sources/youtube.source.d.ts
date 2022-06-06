import { Client } from 'discord.js';
import { Subject, Subscription } from 'rxjs';
import { YoutubeSourceOpts, YoutubeSourceStreamChanges } from '../../shared/interfaces/sources/youtube.source.model';
import { SJSConfiguration } from '../configuration/configuration';
export declare class YoutubeSource {
    private readonly api;
    private readonly subscriptions;
    private readonly configService;
    readonly streamChanges: Subject<YoutubeSourceStreamChanges>;
    constructor(opts: YoutubeSourceOpts, configService: SJSConfiguration);
    init(): import("rxjs").Observable<null>;
    addStreamers(guildId: string, displayNames: string[]): import("rxjs").Observable<{
        userId: string;
        displayName: string;
    }[] | undefined>;
    removeStreamers(guildId: string, displayNames: string[]): number;
    subscribeToStreamChanges(client: Client): Subscription;
    setStreamerSubscription(guildId: string, userId: string): void;
    removeStreamerSubscription(guildId: string, streamer: any): void;
    private getChannelIdByCustomUrl;
    private get configuration();
}
