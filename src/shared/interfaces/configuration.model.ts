import { Sources } from './sources.model';

export interface IConfiguration {
  botStatus: string;
  adminUsers: string[];
  trovo: {
    interval: number;
  };
  youtube: {
    interval: number;
  };
  guilds: {
    [key: string]: IGuildConfiguration;
  };
}

export interface IGuildConfiguration {
  guildName: string;
  guildId: string;
  channelId?: string;
  announcementMessage: string;
  sources: Sources;
}
