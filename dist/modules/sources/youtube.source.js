"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YoutubeSource = void 0;
const googleapis_1 = require("googleapis");
const moment_1 = __importDefault(require("moment"));
const rxjs_1 = require("rxjs");
const discord_model_1 = require("../../shared/interfaces/discord.model");
const youtube_source_model_1 = require("../../shared/interfaces/sources/youtube.source.model");
const utils_1 = require("../../shared/utils/utils");
class YoutubeSource {
    constructor(opts, configService) {
        this.subscriptions = {};
        this.streamChanges = new rxjs_1.Subject();
        this.api = googleapis_1.google.youtube({ version: 'v3', auth: opts.apiKey });
        this.configService = configService;
    }
    init() {
        return (0, rxjs_1.of)(null).pipe((0, rxjs_1.tap)(() => {
            const GUILDS = Object.values(this.configuration.guilds);
            const HAS_GUILDS = GUILDS.length > 0;
            const HAS_STREAMERS = GUILDS.some((guild) => Object.values(guild.sources.youtube).length > 0);
            if (HAS_GUILDS && HAS_STREAMERS) {
                Object.values(this.configuration.guilds).forEach((guild) => {
                    const STREAMERS = Object.values(guild.sources.youtube);
                    STREAMERS.forEach((streamer) => {
                        this.setStreamerSubscription(guild.guildId, streamer.userId);
                    });
                    console.log(`[${(0, utils_1.getNow)()}] [streambot.js] {Youtube} Subscribed to ${STREAMERS.length} channels on server ${guild.guildName}`);
                });
            }
            else {
                console.log(`[${(0, utils_1.getNow)()}] [streambot.js] {Youtube} No channels to subscribe`);
            }
        }));
    }
    addStreamers(guildId, displayNames) {
        const CHANNEL_IDS = [];
        const CUSTOM_URLS = [];
        const CURRENT_STREAMS = Object.values(this.configuration.guilds[guildId].sources.youtube);
        for (let name of displayNames) {
            if (youtube_source_model_1.YOUTUBE_CHANNEL_ID_REGEX.test(name)) {
                const EXISTS = CURRENT_STREAMS.some((streamer) => streamer.userId === name);
                if (!EXISTS)
                    CHANNEL_IDS.push(name);
            }
            else {
                const EXISTS = CURRENT_STREAMS.some((streamer) => streamer.displayName === name);
                if (!EXISTS)
                    CUSTOM_URLS.push(name);
            }
        }
        const CUSTOM_URLS$ = (0, rxjs_1.iif)(() => CUSTOM_URLS.length > 0, (0, rxjs_1.combineLatest)(CUSTOM_URLS.map((customUrl) => this.getChannelIdByCustomUrl(customUrl))).pipe((0, rxjs_1.map)((idsFromCustom) => idsFromCustom.filter((id) => Boolean(id)))), (0, rxjs_1.of)([]));
        return CUSTOM_URLS$.pipe((0, rxjs_1.switchMap)((idsFromCustom) => {
            const FILTERED_IDS = idsFromCustom.filter((id) => !CURRENT_STREAMS.some((streamer) => streamer.userId === id));
            return (0, rxjs_1.defer)(() => this.api.channels.list({ part: ['snippet'], id: [...CHANNEL_IDS, ...FILTERED_IDS], maxResults: 50 }));
        }), (0, rxjs_1.map)((response) => response.data.items), (0, rxjs_1.map)((response) => response === null || response === void 0 ? void 0 : response.map((channel) => { var _a, _b; return ({ userId: channel.id || '', displayName: ((_a = channel.snippet) === null || _a === void 0 ? void 0 : _a.customUrl) || ((_b = channel.snippet) === null || _b === void 0 ? void 0 : _b.title) || '' }); })), (0, rxjs_1.tap)((streamers) => {
            streamers === null || streamers === void 0 ? void 0 : streamers.forEach((streamer) => {
                this.configuration.guilds[guildId].sources.youtube[streamer.userId] = streamer;
                this.setStreamerSubscription(guildId, streamer.userId);
            });
            this.configService.saveChanges();
        }));
    }
    removeStreamers(guildId, displayNames) {
        const CURRENT_STREAMS = Object.values(this.configuration.guilds[guildId].sources.youtube);
        let removedStreamers = 0;
        for (let name of displayNames) {
            const STREAMER = youtube_source_model_1.YOUTUBE_CHANNEL_ID_REGEX.test(name)
                ? CURRENT_STREAMS.find((streamer) => streamer.userId === name)
                : CURRENT_STREAMS.find((streamer) => streamer.displayName === name);
            if (STREAMER) {
                this.removeStreamerSubscription(guildId, STREAMER);
                delete this.configuration.guilds[guildId].sources.youtube[STREAMER.userId];
                removedStreamers++;
            }
        }
        this.configService.saveChanges();
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
                    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                    const msgOptions = {
                        content: (settings.announcementMessage || discord_model_1.DEFAULT_MESSAGE).replace('{DISPLAYNAME}', ((_a = streamChanges.stream.snippet) === null || _a === void 0 ? void 0 : _a.channelTitle) || ''),
                        embeds: [
                            {
                                title: ((_b = streamChanges.stream.snippet) === null || _b === void 0 ? void 0 : _b.title) || '',
                                description: `https://www.youtube.com/watch?v=${(_c = streamChanges.stream.id) === null || _c === void 0 ? void 0 : _c.videoId}`,
                                color: 0xff0000,
                                timestamp: new Date(),
                                footer: {
                                    text: 'YouTube',
                                },
                                author: {
                                    name: ((_d = streamChanges.stream.snippet) === null || _d === void 0 ? void 0 : _d.channelTitle) || '',
                                    url: `https://www.youtube.com/watch?v=${(_e = streamChanges.stream.id) === null || _e === void 0 ? void 0 : _e.videoId}`,
                                    icon_url: ((_f = client.user) === null || _f === void 0 ? void 0 : _f.avatar) || '',
                                },
                                thumbnail: {
                                    url: ((_j = (_h = (_g = streamChanges.stream.snippet) === null || _g === void 0 ? void 0 : _g.thumbnails) === null || _h === void 0 ? void 0 : _h.default) === null || _j === void 0 ? void 0 : _j.url) || '',
                                },
                            },
                        ],
                    };
                    const lastStreamMessageId = this.configuration.guilds[streamChanges.guildId].sources.youtube[streamChanges.userId].lastStreamMessageId;
                    return lastStreamMessageId === undefined
                        ? channel.send(msgOptions)
                        : (0, rxjs_1.defer)(() => channel.messages.fetch(lastStreamMessageId)).pipe((0, rxjs_1.catchError)(() => (0, rxjs_1.of)(null)), (0, rxjs_1.switchMap)((msg) => {
                            if (msg === null)
                                return (0, rxjs_1.defer)(() => channel.send(msgOptions));
                            const MESSAGE_TIMESTAMP = (0, moment_1.default)(msg.embeds[0].timestamp);
                            const SIX_HOURS_AGO = (0, moment_1.default)().subtract(6, 'hours');
                            return MESSAGE_TIMESTAMP.isAfter(SIX_HOURS_AGO)
                                ? (0, rxjs_1.defer)(() => msg.edit(msgOptions))
                                : (0, rxjs_1.defer)(() => channel.send(msgOptions));
                        }));
                }), (0, rxjs_1.tap)((message) => {
                    if (!Array.isArray(message)) {
                        const streamer = this.configuration.guilds[streamChanges.guildId].sources.youtube[streamChanges.userId];
                        streamer.lastStreamMessageId = message.id;
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
        this.subscriptions[guildId][userId] = (0, rxjs_1.interval)(this.configuration.youtube.interval * 60 * 1000)
            .pipe((0, rxjs_1.switchMap)(() => {
            return (0, rxjs_1.defer)(() => this.api.search.list({
                part: ['snippet'],
                type: ['video'],
                eventType: 'live',
                channelId: userId,
            })).pipe((0, rxjs_1.map)((response) => response.data.items || []));
        }), (0, rxjs_1.filter)((streams) => {
            var _a;
            const IS_LIVE = !lastStream.is_live && streams.length > 0;
            const TITLE_CHANGED = streams.length > 0 && lastStream.live_title !== ((_a = streams[0].snippet) === null || _a === void 0 ? void 0 : _a.title);
            return IS_LIVE || TITLE_CHANGED;
        }), (0, rxjs_1.map)((streams) => streams[0]), (0, rxjs_1.catchError)(() => (0, rxjs_1.of)(null)))
            .subscribe((stream) => {
            var _a;
            if (stream === null)
                return;
            lastStream = { is_live: true, live_title: ((_a = stream.snippet) === null || _a === void 0 ? void 0 : _a.title) || '', category_name: 'YouTube' };
            this.streamChanges.next({ guildId, userId, stream });
        });
    }
    removeStreamerSubscription(guildId, streamer) {
        this.subscriptions[guildId][streamer.userId].unsubscribe();
        delete this.subscriptions[guildId][streamer.userId];
    }
    getChannelIdByCustomUrl(customUrl) {
        return (0, rxjs_1.defer)(() => this.api.search.list({ part: ['snippet'], type: ['channel'], q: customUrl, maxResults: 50 })).pipe((0, rxjs_1.map)((response) => {
            var _a;
            const channelIds = [];
            (_a = response.data.items) === null || _a === void 0 ? void 0 : _a.forEach((item) => {
                var _a;
                const id = (_a = item.id) === null || _a === void 0 ? void 0 : _a.channelId;
                if (id)
                    channelIds.push(id);
            });
            return channelIds;
        }), (0, rxjs_1.switchMap)((channelIds) => {
            if (channelIds.length) {
                return (0, rxjs_1.defer)(() => this.api.channels.list({ part: ['snippet'], id: channelIds }));
            }
            else {
                return (0, rxjs_1.of)(null);
            }
        }), (0, rxjs_1.map)((response) => { var _a; return ((_a = response === null || response === void 0 ? void 0 : response.data.items) === null || _a === void 0 ? void 0 : _a.filter((item) => { var _a, _b; return ((_b = (_a = item.snippet) === null || _a === void 0 ? void 0 : _a.customUrl) === null || _b === void 0 ? void 0 : _b.toLowerCase()) === customUrl.toLowerCase(); })) || []; }), (0, rxjs_1.map)((response) => (response.length && response[0].id ? response[0].id : null)));
    }
    get configuration() {
        return this.configService.getConfiguration();
    }
}
exports.YoutubeSource = YoutubeSource;
