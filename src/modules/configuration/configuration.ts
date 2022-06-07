import { defaultsDeep } from 'lodash';
import { Subject } from 'rxjs';
import { IConfiguration } from '../../shared/interfaces/configuration.model';

export class SJSConfiguration {
  private _configuration: IConfiguration;
  private _queue = new Subject<IConfiguration>();

  constructor() {
    this._configuration = SJSConfiguration.defaults;
  }

  public setConfiguration(configuration: IConfiguration) {
    defaultsDeep(configuration, SJSConfiguration.defaults);
    this._configuration = configuration;
    this.saveChanges();
  }

  public getConfiguration(): IConfiguration {
    return this._configuration;
  }

  public saveChanges(): void {
    this._queue.next(this._configuration);
  }

  public get configurationChanges() {
    return this._queue.asObservable();
  }

  private static get defaults(): IConfiguration {
    return {
      botStatus: 'Streambot.js',
      adminUsers: [],
      trovo: {
        interval: 2,
      },
      youtube: {
        interval: 2,
      },
      guilds: {},
    };
  }
}
