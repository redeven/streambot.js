"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrovoSource = void 0;
const moment_1 = __importDefault(require("moment"));
const rxjs_1 = require("rxjs");
const discord_model_1 = require("../../shared/interfaces/discord.model");
const trovo_source_model_1 = require("../../shared/interfaces/trovo.source.model");
const utils_1 = require("../../shared/utils/utils");
class TrovoSource {
    constructor(opts, configService) {
        this.subscriptions = {};
        this.streamChanges = new rxjs_1.Subject();
        this.configService = configService;
        this.opts = opts;
    }
    init() {
        return (0, rxjs_1.of)(null).pipe((0, rxjs_1.tap)(() => {
            const GUILDS = Object.values(this.configuration.guilds);
            const HAS_GUILDS = GUILDS.length > 0;
            const HAS_STREAMERS = GUILDS.some((guild) => Object.values(guild.sources.trovo).length > 0);
            if (HAS_GUILDS && HAS_STREAMERS) {
                Object.values(this.configuration.guilds).forEach((guild) => {
                    const STREAMERS = Object.values(guild.sources.trovo);
                    STREAMERS.forEach((streamer) => {
                        this.setStreamerSubscription(guild.guildId, streamer.userId);
                    });
                    console.log(`[${(0, utils_1.getNow)()}] [streambot.js] {Trovo} Subscribed to ${STREAMERS.length} channels on server ${guild.guildName}`);
                });
            }
            else {
                console.log(`[${(0, utils_1.getNow)()}] [streambot.js] {Trovo} No channels to subscribe`);
            }
        }));
    }
    addStreamers(guildId, displayNames) {
        const newStreamers = [];
        for (let displayName of displayNames) {
            const streamer = Object.values(this.configuration.guilds[guildId].sources.trovo).find((str) => str.displayName.toLowerCase() === displayName.toLowerCase());
            if (!streamer)
                newStreamers.push(displayName);
        }
        return this.getUsers(newStreamers).pipe((0, rxjs_1.map)((response) => {
            if (response === null)
                return [];
            return response.users
                .filter((user) => newStreamers.includes(user.username))
                .map((user) => ({ userId: user.channel_id, displayName: user.username }));
        }), (0, rxjs_1.tap)((streamers) => {
            streamers.forEach((streamer) => {
                this.configuration.guilds[guildId].sources.trovo[streamer.userId] = streamer;
                this.setStreamerSubscription(guildId, streamer.userId);
            });
            this.configService.saveChanges();
        }));
    }
    removeStreamers(guildId, displayNames) {
        let removedStreamers = 0;
        for (let displayName of displayNames) {
            const streamer = Object.values(this.configuration.guilds[guildId].sources.trovo).find((str) => str.displayName.toLowerCase() === displayName.toLowerCase());
            if (streamer) {
                this.removeStreamerSubscription(guildId, streamer);
                delete this.configuration.guilds[guildId].sources.trovo[streamer.userId];
                this.configService.saveChanges();
                removedStreamers++;
            }
        }
        return removedStreamers;
    }
    subscribeToStreamChanges(client) {
        return this.streamChanges
            .pipe((0, rxjs_1.tap)((streamChanges) => {
            const settings = this.configuration.guilds[streamChanges.guildId];
            const channelId = settings.channelId;
            if (channelId) {
                (0, rxjs_1.defer)(() => client.channels.fetch(channelId))
                    .pipe((0, rxjs_1.catchError)(() => rxjs_1.EMPTY), (0, rxjs_1.switchMap)((channel) => {
                    const msgOptions = {
                        content: (settings.announcementMessage || discord_model_1.DEFAULT_ANNOUNCEMENT).replace('{DISPLAYNAME}', streamChanges.stream.username),
                        embeds: [
                            {
                                title: streamChanges.stream.live_title,
                                description: streamChanges.stream.channel_url,
                                color: 0x30c07b,
                                timestamp: new Date(),
                                footer: {
                                    text: streamChanges.stream.category_name,
                                },
                                author: {
                                    name: streamChanges.stream.username,
                                    url: streamChanges.stream.channel_url,
                                    icon_url: streamChanges.stream.profile_pic,
                                },
                                thumbnail: {
                                    url: streamChanges.stream.thumbnail,
                                },
                            },
                        ],
                    };
                    const lastStreamMessageId = this.configuration.guilds[streamChanges.guildId].sources.trovo[streamChanges.userId].lastStreamMessageId;
                    return lastStreamMessageId === undefined
                        ? channel.send(msgOptions)
                        : (0, rxjs_1.defer)(() => channel.messages.fetch(lastStreamMessageId)).pipe((0, rxjs_1.catchError)(() => (0, rxjs_1.of)(null)), (0, rxjs_1.switchMap)((msg) => {
                            if (msg === null)
                                return (0, rxjs_1.defer)(() => channel.send(msgOptions));
                            const MESSAGE_TIMESTAMP = (0, moment_1.default)(msg.embeds[0].timestamp);
                            const THREE_HOURS_AGO = (0, moment_1.default)().subtract(6, 'hours');
                            return MESSAGE_TIMESTAMP.isAfter(THREE_HOURS_AGO)
                                ? (0, rxjs_1.defer)(() => msg.edit(msgOptions))
                                : (0, rxjs_1.defer)(() => channel.send(msgOptions));
                        }));
                }), (0, rxjs_1.tap)((message) => {
                    var _a;
                    if (!Array.isArray(message)) {
                        const streamer = this.configuration.guilds[streamChanges.guildId].sources.trovo[streamChanges.userId];
                        streamer.lastStreamMessageId = message.id;
                        if ((_a = message.embeds[0].author) === null || _a === void 0 ? void 0 : _a.name) {
                            streamer.displayName = message.embeds[0].author.name;
                        }
                        this.configService.saveChanges();
                    }
                }))
                    .subscribe();
            }
        }))
            .subscribe();
    }
    setStreamerSubscription(guildId, userId) {
        if (!this.subscriptions[guildId])
            this.subscriptions[guildId] = {};
        let lastStream = { is_live: false, live_title: '', category_name: '' };
        this.subscriptions[guildId][userId] = (0, rxjs_1.interval)(this.configuration.trovo.interval * 60 * 1000)
            .pipe((0, rxjs_1.switchMap)(() => {
            return (0, rxjs_1.defer)(() => fetch('https://open-api.trovo.live/openplatform/channels/id', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Client-ID': this.opts.clientId,
                },
                body: JSON.stringify({ channel_id: userId }),
            })).pipe((0, rxjs_1.switchMap)((response) => (0, rxjs_1.defer)(() => response.json())));
        }), (0, rxjs_1.filter)((stream) => {
            const IS_LIVE = !lastStream.is_live && stream.is_live;
            const TITLE_CHANGED = stream.is_live && lastStream.live_title !== stream.live_title;
            const GAME_CHANGED = stream.is_live && lastStream.category_name !== stream.category_name;
            return IS_LIVE || TITLE_CHANGED || GAME_CHANGED;
        }), (0, rxjs_1.catchError)(() => (0, rxjs_1.of)(null)))
            .subscribe((stream) => {
            if (stream === null)
                return;
            lastStream = { is_live: stream.is_live, live_title: stream.live_title, category_name: stream.category_name };
            this.streamChanges.next({ guildId, userId, stream });
        });
    }
    removeStreamerSubscription(guildId, streamer) {
        this.subscriptions[guildId][streamer.userId].unsubscribe();
        delete this.subscriptions[guildId][streamer.userId];
    }
    getUsers(displayNames) {
        const user = displayNames.filter((displayName) => trovo_source_model_1.TROVO_NAME_REGEX.test(displayName));
        return (0, rxjs_1.defer)(() => fetch('https://open-api.trovo.live/openplatform/getusers', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Client-ID': this.opts.clientId,
            },
            body: JSON.stringify({ user }),
        })).pipe((0, rxjs_1.switchMap)((response) => (0, rxjs_1.defer)(() => response.json())), (0, rxjs_1.catchError)(() => (0, rxjs_1.of)(null)));
    }
    get configuration() {
        return this.configService.getConfiguration();
    }
}
exports.TrovoSource = TrovoSource;
