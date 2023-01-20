import { EventSubStreamOnlineEvent, EventSubSubscription } from '@twurple/eventsub-base';

export interface TwitchSourceOpts {
  clientId: string;
  clientSecret: string;
  hostName: string;
  expressMiddleware?: boolean;
  port?: number;
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

export const TWITCH_NAME_REGEX = /^[a-zA-Z0-9\-\_]{4,25}$/g;
