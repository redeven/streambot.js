import { Observable } from 'rxjs';
import { SJSDiscordInitOpts } from '../../shared/interfaces/discord.model';
import { SJSConfiguration } from '../configuration/configuration';
import { EventSubHttpListenerCertificateConfig } from '@twurple/eventsub-http';
export declare class SJSDiscord {
    private configService;
    private client;
    private rest;
    private commands;
    private sources;
    constructor(opts: SJSDiscordInitOpts, configService: SJSConfiguration, sslCert: EventSubHttpListenerCertificateConfig);
    init(opts: SJSDiscordInitOpts): Observable<any[]>;
    private setBotCommands;
    private registerBotCommands;
    private removeDeprecatedCommands;
    private onReady;
    private onGuildCreate;
    private onGuildDelete;
    private onInteractionCreate;
    private getGuildDefaults;
    private get configuration();
    get expressMiddleware(): import("@twurple/eventsub-http").EventSubMiddleware | undefined;
}
