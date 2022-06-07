import { Client } from 'discord.js';
import { Observable, Subject, Subscription } from 'rxjs';
import { StreamerInfo } from '../../shared/interfaces/sources.model';
import { TrovoSourceOpts, TrovoSourceStreamChanges } from '../../shared/interfaces/sources/trovo.source.model';
import { SJSConfiguration } from '../configuration/configuration';
export declare class TrovoSource {
    private readonly opts;
    private readonly subscriptions;
    private readonly configService;
    readonly streamChanges: Subject<TrovoSourceStreamChanges>;
    constructor(opts: TrovoSourceOpts, configService: SJSConfiguration);
    init(): Observable<null>;
    addStreamers(guildId: string, displayNames: string[]): Observable<StreamerInfo[]>;
    removeStreamers(guildId: string, displayNames: string[]): number;
    subscribeToStreamChanges(client: Client): Subscription;
    setStreamerSubscription(guildId: string, userId: string): void;
    removeStreamerSubscription(guildId: string, streamer: StreamerInfo): void;
    private getUsers;
    private get configuration();
}
