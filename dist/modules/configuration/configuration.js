"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SJSConfiguration = void 0;
const lodash_1 = require("lodash");
const rxjs_1 = require("rxjs");
class SJSConfiguration {
    constructor() {
        this._queue = new rxjs_1.Subject();
        this._configuration = SJSConfiguration.defaults;
    }
    setConfiguration(configuration) {
        (0, lodash_1.defaultsDeep)(configuration, SJSConfiguration.defaults);
        this._configuration = configuration;
        this.saveChanges();
    }
    getConfiguration() {
        return this._configuration;
    }
    saveChanges() {
        this._queue.next(this._configuration);
    }
    get configurationChanges() {
        return this._queue.asObservable();
    }
    static get defaults() {
        return {
            botStatus: 'Streambot.js',
            adminUsers: [],
            trovo: {
                interval: 2,
            },
            guilds: {},
        };
    }
}
exports.SJSConfiguration = SJSConfiguration;
