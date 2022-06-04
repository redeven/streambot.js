import { EventSubStreamOnlineEvent, EventSubSubscription } from '@twurple/eventsub';
export interface TwitchSourceOpts {
    clientId: string;
    clientSecret: string;
    hostName: string;
    expressMiddleware?: boolean;
}
export interface TwitchSourceStreamChanges {
    guildId: string;
    userId: string;
    stream: EventSubStreamOnlineEvent;
}
export interface TwitchSourceSubscriptions {
    [key: string]: {
        [key: string]: EventSubSubscription;
    };
}
export interface TwitchInvalidSubscription {
    guildId: string;
    userId: string;
    subscription: EventSubSubscription;
}
export declare const TWITCH_NAME_REGEX: RegExp;
export declare enum LogLevel {
    CRITICAL = 0,
    ERROR = 1,
    WARNING = 2,
    INFO = 3,
    DEBUG = 4,
    TRACE = 7
}
