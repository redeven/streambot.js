import { IConfiguration } from '../../shared/interfaces/configuration.model';
export declare class SJSConfiguration {
    private _configuration;
    private _queue;
    constructor();
    setConfiguration(configuration: IConfiguration): void;
    getConfiguration(): IConfiguration;
    saveChanges(): void;
    get configurationChanges(): import("rxjs").Observable<IConfiguration>;
    private static get defaults();
}
