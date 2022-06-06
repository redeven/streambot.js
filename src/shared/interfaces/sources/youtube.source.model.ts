import { youtube_v3 } from 'googleapis';
import { Subscription } from 'rxjs';

export interface YoutubeSourceOpts {
  apiKey: string;
}

export interface YoutubeSourceStreamChanges {
  guildId: string;
  userId: string;
  stream: youtube_v3.Schema$SearchResult;
}

export interface YoutubeSourceSubscriptions {
  [key: string]: {
    [key: string]: Subscription;
  };
}

export const YOUTUBE_CHANNEL_ID_REGEX = /UC[\w-]{21}[AQgw]/g;
