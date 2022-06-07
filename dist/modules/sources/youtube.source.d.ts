import { Client } from 'discord.js';
import { Observable, Subject, Subscription } from 'rxjs';
import { YoutubeCustomUrlResult, YoutubeSourceOpts, YoutubeSourceStreamChanges } from '../../shared/interfaces/sources/youtube.source.model';
import { SJSConfiguration } from '../configuration/configuration';
export declare class YoutubeSource {
    private readonly api;
    private readonly subscriptions;
    private readonly configService;
    readonly streamChanges: Subject<YoutubeSourceStreamChanges>;
    constructor(opts: YoutubeSourceOpts, configService: SJSConfiguration);
    init(): Observable<null>;
    addStreamers(guildId: string, displayNames: string[]): Observable<YoutubeCustomUrlResult[]>;
    removeStreamers(guildId: string, displayNames: string[]): number;
    subscribeToStreamChanges(client: Client): Subscription;
    setStreamerSubscription(guildId: string, userId: string): void;
    removeStreamerSubscription(guildId: string, streamer: any): void;
    private getChannelIdByCustomUrl;
    private get configuration();
}
