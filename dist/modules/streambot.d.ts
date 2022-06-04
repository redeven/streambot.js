import { IConfiguration } from '../shared/interfaces/configuration.model';
import { StreambotJsInitOpts, StreambotJsSslCert } from '../shared/interfaces/streambot.model';
export declare class StreambotJs {
    private readonly configService;
    private readonly discord;
    constructor(opts: StreambotJsInitOpts, sslCert: StreambotJsSslCert);
    init(opts: StreambotJsInitOpts): import("rxjs").Observable<[string, import("@twurple/eventsub/lib").EventSubSubscription<unknown>[], null]>;
    setConfiguration(configuration: IConfiguration): void;
    get configurationChanges(): import("rxjs").Observable<IConfiguration>;
    get expressMiddleware(): import("@twurple/eventsub/lib").EventSubMiddleware;
}
