import { youtube_v3 } from 'googleapis';
import { Subscription } from 'rxjs';

export interface YoutubeSourceOpts {
  apiKey: string;
}

export interface YoutubeSourceStreamChanges {
  guildId: string;
  userId: string;
  stream: YoutubeStream;
}

export interface YoutubeStream {
  url: string;
  title: string;
  author?: string;
}

export interface YoutubeCustomUrlResult {
  customUrl: string | null;
  channelId: string | null;
}

export interface YoutubeSourceSubscriptions {
  [key: string]: {
    [key: string]: Subscription;
  };
}

export const YOUTUBE_CHANNEL_ID_REGEX = /UC[\w-]{21}[AQgw]/g;
