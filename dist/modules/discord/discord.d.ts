import { Observable } from 'rxjs';
import { SJSDiscordInitOpts } from '../../shared/interfaces/discord';
import { SJSConfiguration } from '../configuration/configuration';
import { EventSubListenerCertificateConfig } from '@twurple/eventsub/lib';
export declare class SJSDiscord {
    private configService;
    private client;
    private rest;
    private commands;
    private sources;
    constructor(opts: SJSDiscordInitOpts, configService: SJSConfiguration);
    init(opts: SJSDiscordInitOpts, sslCert: EventSubListenerCertificateConfig, configService: SJSConfiguration): Observable<any[]>;
    private setBotCommands;
    private registerBotCommands;
    private removeDeprecatedCommands;
    private onReady;
    private onGuildCreate;
    private onGuildDelete;
    private onInteractionCreate;
    private getGuildDefaults;
    private get configuration();
    get expressMiddleware(): import("@twurple/eventsub/lib").EventSubMiddleware | undefined;
}
