export type Source = 'twitch' | 'trovo';

export const SOURCE_CHOICES: Source[] = ['twitch', 'trovo'];

export type Sources = {
  [key in Source]: StreamerList;
};

export interface StreamerList {
  [key: string]: StreamerInfo;
}

export interface StreamerInfo {
  userId: string;
  displayName: string;
  lastStreamMessageId?: string;
}
