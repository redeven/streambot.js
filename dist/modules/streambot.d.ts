import { IConfiguration } from '../shared/interfaces/configuration.model';
import { StreambotJsInitOpts, StreambotJsSslCert } from '../shared/interfaces/streambot.model';
export declare class StreambotJs {
    private readonly configService;
    private readonly discord;
    private readonly sslCert;
    constructor(opts: StreambotJsInitOpts, sslCert: StreambotJsSslCert);
    init(opts: StreambotJsInitOpts): import("rxjs").Observable<any[]>;
    setConfiguration(configuration: IConfiguration): void;
    get configurationChanges(): import("rxjs").Observable<IConfiguration>;
    get expressMiddleware(): import("@twurple/eventsub/lib").EventSubMiddleware | undefined;
}
