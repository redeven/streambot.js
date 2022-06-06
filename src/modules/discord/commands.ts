import { CommandFactory } from '../../shared/interfaces/discord.model';
import { ADD_STREAMERS_FACTORY } from './commands/addstreamers';
import { DEL_STREAMERS_FACTORY } from './commands/delstreamers';
import { REAUTHORIZE_FACTORY } from './commands/reauthorize';
import { SET_CHANNEL_FACTORY } from './commands/setchannel';
import { SET_MESSAGE_FACTORY } from './commands/setmessage';
import { STREAMER_LIST_FACTORY } from './commands/streamerlist';
import { VALIDATE_FACTORY } from './commands/validate';

export const Commands: { [key: string]: CommandFactory } = {
  AddStreamers: ADD_STREAMERS_FACTORY,
  DelStreamers: DEL_STREAMERS_FACTORY,
  Reauthorize: REAUTHORIZE_FACTORY,
  SetChannel: SET_CHANNEL_FACTORY,
  SetMessage: SET_MESSAGE_FACTORY,
  StreamerList: STREAMER_LIST_FACTORY,
  Validate: VALIDATE_FACTORY,
};
