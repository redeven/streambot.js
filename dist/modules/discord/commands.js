"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Commands = void 0;
const addstreamers_1 = require("./commands/addstreamers");
const delstreamers_1 = require("./commands/delstreamers");
const reauthorize_1 = require("./commands/reauthorize");
const setchannel_1 = require("./commands/setchannel");
const setmessage_1 = require("./commands/setmessage");
const streamerlist_1 = require("./commands/streamerlist");
const validate_1 = require("./commands/validate");
exports.Commands = {
    AddStreamers: addstreamers_1.ADD_STREAMERS_FACTORY,
    DelStreamers: delstreamers_1.DEL_STREAMERS_FACTORY,
    Reauthorize: reauthorize_1.REAUTHORIZE_FACTORY,
    SetChannel: setchannel_1.SET_CHANNEL_FACTORY,
    SetMessage: setmessage_1.SET_MESSAGE_FACTORY,
    StreamerList: streamerlist_1.STREAMER_LIST_FACTORY,
    Validate: validate_1.VALIDATE_FACTORY,
};
